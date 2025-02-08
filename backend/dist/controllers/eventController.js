"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveEvent = exports.joinEvent = exports.deleteEvent = exports.updateEvent = exports.getEventById = exports.getEvents = exports.createEvent = exports.searchEvents = void 0;
const Event_1 = __importDefault(require("../models/Event"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const searchEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, location } = req.query;
        let query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        const events = yield Event_1.default.find(query)
            .populate('creator', 'name email')
            .populate('attendees', 'name email')
            .sort({ date: 1 });
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.searchEvents = searchEvents;
const createEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('req.body:', req.body);
        let imageUrl = '';
        if (req.file) {
            const result = yield cloudinary_1.default.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
        }
        const event = yield Event_1.default.create(Object.assign(Object.assign({}, req.body), { creator: req.user.id, imageUrl }));
        const populatedEvent = yield Event_1.default.findById(event._id)
            .populate('creator', 'name email')
            .populate('attendees', 'name email');
        // Emit event creation
        const io = req.app.get('io');
        io.emit('eventCreated', populatedEvent);
        res.status(201).json(populatedEvent);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.createEvent = createEvent;
const getEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, date, page = 1, limit = 9 } = req.query;
        let query = {};
        if (category) {
            query = Object.assign(Object.assign({}, query), { category });
        }
        if (date) {
            query = Object.assign(Object.assign({}, query), { date: { $gte: new Date(date) } });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [events, total] = yield Promise.all([
            Event_1.default.find(query)
                .populate('creator', 'name email')
                .populate('attendees', 'name email')
                .sort({ date: 1 })
                .skip(skip)
                .limit(Number(limit)),
            Event_1.default.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / Number(limit));
        console.log(events);
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getEvents = getEvents;
const getEventById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id)
            .populate('creator', 'name email')
            .populate('attendees', 'name email');
        if (event) {
            res.json(event);
        }
        else {
            res.status(404).json({ message: 'Event not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getEventById = getEventById;
const updateEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.creator.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        console.log(req.url);
        let imageUrl = event.imageUrl;
        if (req.file) {
            // Delete old image if it exists
            if (event.imageUrl) {
                const publicId = (_a = event.imageUrl.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('.')[0];
                if (publicId) {
                    yield cloudinary_1.default.uploader.destroy(publicId);
                }
            }
            // Upload new image
            const result = yield cloudinary_1.default.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
        }
        const updatedEvent = yield Event_1.default.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { imageUrl }), { new: true })
            .populate('creator', 'name email')
            .populate('attendees', 'name email');
        // Emit event update
        const io = req.app.get('io');
        io.emit('eventUpdated', updatedEvent);
        res.json(updatedEvent);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.updateEvent = updateEvent;
const deleteEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.creator.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        yield event.deleteOne();
        // Emit event deletion
        const io = req.app.get('io');
        io.emit('eventDeleted', req.params.id);
        res.json({ message: 'Event removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.deleteEvent = deleteEvent;
const joinEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
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
        const updatedEvent = yield event.save();
        const populatedEvent = yield Event_1.default.findById(updatedEvent._id)
            .populate('creator', 'name email')
            .populate('attendees', 'name email');
        // Get the io instance and emit the update
        const io = req.app.get('io');
        io.to(req.params.id).emit('attendeeUpdate', populatedEvent);
        res.json(populatedEvent);
    }
    catch (error) {
        console.error('Error in joinEvent:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.joinEvent = joinEvent;
const leaveEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (!event.attendees.includes(req.user.id)) {
            return res.status(400).json({ message: 'Not joined' });
        }
        event.attendees = event.attendees.filter((attendee) => attendee.toString() !== req.user.id);
        const updatedEvent = yield event.save();
        const populatedEvent = yield Event_1.default.findById(updatedEvent._id)
            .populate('creator', 'name email')
            .populate('attendees', 'name email');
        // Get the io instance and emit the update
        const io = req.app.get('io');
        io.to(req.params.id).emit('attendeeUpdate', populatedEvent);
        res.json(populatedEvent);
    }
    catch (error) {
        console.error('Error in leaveEvent:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.leaveEvent = leaveEvent;
