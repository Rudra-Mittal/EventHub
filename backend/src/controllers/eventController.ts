// @ts-nocheck
import { Request, Response } from 'express';
import Event from '../models/Event';
import cloudinary from '../config/cloudinary';

export const searchEvents = async (req: Request, res: Response) => {
  try {
    const { search, location } = req.query;
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const events = await Event.find(query)
      .populate('creator', 'name email')
      .populate('attendees', 'name email')
      .sort({ date: 1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    console.log('req.body:', req.body);
    let imageUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    const event = await Event.create({
      ...req.body,
      creator: req.user.id,
      imageUrl,
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    // Emit event creation
    const io = req.app.get('io');
    io.emit('eventCreated', populatedEvent);

    res.status(201).json(populatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { category, date, page = 1, limit = 9 } = req.query;
    let query: any = {};

    if (category) {
      query = { ...query, category };
    }
    if (date) {
      query = { ...query, date: { $gte: new Date(date as string) } };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('creator', 'name email')
        .populate('attendees', 'name email')
        .sort({ date: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Event.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / Number(limit));
    console.log(events)
    res.json({
      events,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalEvents: total,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    console.log(req.url)
    let imageUrl = event.imageUrl;
    if (req.file) {
      // Delete old image if it exists
      if (event.imageUrl) {
        const publicId = event.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, imageUrl },
      { new: true }
    )
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    // Emit event update
    const io = req.app.get('io');
    io.emit('eventUpdated', updatedEvent);

    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await event.deleteOne();

    // Emit event deletion
    const io = req.app.get('io');
    io.emit('eventDeleted', req.params.id);

    res.json({ message: 'Event removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const joinEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already joined' });
    }

    if (event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({ message: 'Event is full' });
    }

    event.attendees.push(req.user.id);
    const updatedEvent = await event.save();

    const populatedEvent = await Event.findById(updatedEvent._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    // Get the io instance and emit the update
    const io = req.app.get('io');
    io.to(req.params.id).emit('attendeeUpdate', populatedEvent);

    res.json(populatedEvent);
  } catch (error) {
    console.error('Error in joinEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const leaveEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'Not joined' });
    }

    event.attendees = event.attendees.filter(
      (attendee) => attendee.toString() !== req.user.id
    );
    const updatedEvent = await event.save();

    const populatedEvent = await Event.findById(updatedEvent._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    // Get the io instance and emit the update
    const io = req.app.get('io');
    io.to(req.params.id).emit('attendeeUpdate', populatedEvent);

    res.json(populatedEvent);
  } catch (error) {
    console.error('Error in leaveEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};