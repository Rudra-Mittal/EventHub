import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { socket, joinEventRoom, leaveEventRoom } from '../services/socket';
import { Event } from '../types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { fadeIn, staggerContainer, scaleButton, cardHover, loadingSpinner } from '../lib/animations';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchEvent = async () => {
      try {
        const response = await api.getEvent(id);
        setEvent(response.data);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        console.error('Error fetching event:', error);
      }
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (id && event) {
      joinEventRoom(id);

      socket.on('eventUpdated', (updatedEvent: Event) => {
        if (updatedEvent._id === id) {
          setEvent(updatedEvent);
        }
      });

      socket.on('eventDeleted', (deletedEventId: string) => {
        if (deletedEventId === id) {
          navigate('/');
        }
      });

      socket.on('attendeeUpdate', (updatedEvent: Event) => {
        setEvent(updatedEvent);
      });

      return () => {
        leaveEventRoom(id);
        socket.off('eventUpdated');
        socket.off('eventDeleted');
        socket.off('attendeeUpdate');
      };
    }
  }, [id, event, navigate]);

  const joinMutation = async () => {
    try {
      api.joinEvent(id!);
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const leaveMutation = async () => {
    try {
      await api.leaveEvent(id!);
      setEvent((prevEvent) => {
        if (!prevEvent) return prevEvent;
        return {
          ...prevEvent,
          attendees: prevEvent.attendees.filter((attendee) => attendee._id !== auth.user?._id),
        };
      });
    } catch (error) {
      console.error('Error leaving event:', error);
    }
  };

  const deleteMutation = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await api.deleteEvent(id!);
        navigate('/');
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <motion.div
          variants={loadingSpinner}
          animate="animate"
          className="text-indigo-600"
        >
          <Loader2 className="h-8 w-8" />
        </motion.div>
      </div>
    );
  }

  if (!event) {
    return (
      <motion.div 
        initial="initial"
        animate="animate"
        variants={fadeIn}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center bg-gradient-to-br from-indigo-100 via-white to-purple-100"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
        <p className="text-gray-600">This event may have been deleted or doesn't exist</p>
      </motion.div>
    );
  }

  const isCreator = auth.user?._id === event.creator._id;
  const isAttending = event.attendees.some((attendee) => attendee._id === auth.user?._id);
  const isFull = event.attendees.length >= event.maxAttendees;

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <motion.div 
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-indigo-100"
          variants={cardHover}
          whileHover="hover"
        >
          {event.imageUrl && (
            <motion.div variants={fadeIn}>
              <img src={event.imageUrl} alt={event.title} className="w-full h-96 object-cover" />
            </motion.div>
          )}

          <motion.div className="px-8 py-6" variants={fadeIn}>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {event.title}
            </h1>
            <p className="mt-2 text-sm">Organized by {event.creator.name}</p>
          </motion.div>

          <motion.div className="border-t border-indigo-100 px-8 py-6" variants={fadeIn}>
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <motion.div className="flex items-center space-x-3" variants={fadeIn}>
                <div>
                  <dt className="text-sm font-medium text-indigo-600">Date</dt>
                  <dd className="mt-1 text-sm">{format(new Date(event.date), 'PPP')}</dd>
                </div>
              </motion.div>

              <motion.div className="flex items-center space-x-3" variants={fadeIn}>
                <div>
                  <dt className="text-sm font-medium text-indigo-600">Location</dt>
                  <dd className="mt-1 text-sm">{event.location}</dd>
                </div>
              </motion.div>

              <motion.div className="flex items-center space-x-3" variants={fadeIn}>
                <div>
                  <dt className="text-sm font-medium text-indigo-600">Category</dt>
                  <dd className="mt-1 text-sm">{event.category}</dd>
                </div>
              </motion.div>

              <motion.div className="flex items-center space-x-3" variants={fadeIn}>
                <div>
                  <dt className="text-sm font-medium text-indigo-600">Attendees</dt>
                  <dd className="mt-1 text-sm">{event.attendees.length}/{event.maxAttendees}</dd>
                </div>
              </motion.div>
            </dl>
          </motion.div>

          <motion.div className="border-t border-indigo-100 px-8 py-6" variants={fadeIn}>
            <h3 className="text-lg font-medium mb-4 text-indigo-600">Description</h3>
            <p>{event.description}</p>
          </motion.div>

          <motion.div className="border-t border-indigo-100 px-8 py-6" variants={fadeIn}>
            <h3 className="text-lg font-medium mb-4 text-indigo-600">Attendees</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence>
                {event.attendees.map((attendee) => (
                  <motion.div
                    key={attendee._id}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="flex items-center space-x-2 text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center">
                      {attendee.name.charAt(0)}
                    </div>
                    <span>{attendee.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {auth.user && (
            <motion.div className="border-t border-indigo-100 px-8 py-6" variants={fadeIn}>
              {isCreator ? (
                <div className="flex space-x-4">
                  <motion.button
                    variants={scaleButton}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => navigate(`/events/${id}/edit`)}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg"
                  >
                    Edit Event
                  </motion.button>
                  <motion.button
                    variants={scaleButton}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={deleteMutation}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg"
                  >
                    Delete Event
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  variants={scaleButton}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => {
                    if (isAttending) {
                      leaveMutation();
                    } else {
                      joinMutation();
                    }
                  }}
                  disabled={!isAttending && isFull}
                  className={`px-6 py-2 rounded-lg text-white ${
                    isAttending
                      ? 'bg-gradient-to-r from-red-600 to-pink-600'
                      : isFull
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600'
                  }`}
                >
                  {isAttending ? 'Leave Event' : isFull ? 'Event is Full' : 'Join Event'}
                </motion.button>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
