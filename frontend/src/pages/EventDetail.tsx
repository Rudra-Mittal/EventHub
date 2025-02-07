import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect } from 'react';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { socket, joinEventRoom, leaveEventRoom } from '../services/socket';
import { Event } from '../types';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.getEvent(id!).then((res) => res.data),
  });

  useEffect(() => {
    if (id) {
      joinEventRoom(id);

      // Listen for event updates
      socket.on('eventUpdated', (updatedEvent: Event) => {
        if (updatedEvent._id === id) {
          queryClient.setQueryData(['event', id], updatedEvent);
        }
      });

      // Listen for event deletion
      socket.on('eventDeleted', (deletedEventId: string) => {
        if (deletedEventId === id) {
          navigate('/');
        }
      });

      // Listen for attendee updates
      socket.on('attendeeUpdate', (updatedEvent: Event) => {
        queryClient.setQueryData(['event', id], updatedEvent);
      });

      return () => {
        leaveEventRoom(id);
        socket.off('eventUpdated');
        socket.off('eventDeleted');
        socket.off('attendeeUpdate');
      };
    }
  }, [id, queryClient, navigate]);

  const joinMutation = useMutation({
    mutationFn: () => api.joinEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.leaveEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteEvent(id!),
    onSuccess: () => {
      navigate('/');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Event not found</h2>
        </div>
      </div>
    );
  }

  const isCreator = auth.user?._id === event.creator._id;
  const isAttending = event.attendees.some(
    (attendee) => attendee._id === auth.user?._id
  );
  const isFull = event.attendees.length >= event.maxAttendees;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-96 object-cover"
          />
        )}
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-3xl font-bold text-gray-900">{event.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Created by {event.creator.name}
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(event.date), 'PPP')}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">{event.location}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">{event.category}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Attendees</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {event.attendees.length}/{event.maxAttendees}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{event.description}</dd>
            </div>
          </dl>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h4 className="text-lg font-medium text-gray-900">Attendees</h4>
          <ul className="mt-4 space-y-2">
            {event.attendees.map((attendee) => (
              <li key={attendee._id} className="text-sm text-gray-500">
                {attendee.name}
              </li>
            ))}
          </ul>
        </div>
        {auth.user && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {isCreator ? (
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate(`/events/${id}/edit`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit Event
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm('Are you sure you want to delete this event?')
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Event
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isAttending) {
                    leaveMutation.mutate();
                  } else {
                    joinMutation.mutate();
                  }
                }}
                disabled={!isAttending && isFull}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isAttending
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : isFull
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                }`}
              >
                {isAttending
                  ? 'Leave Event'
                  : isFull
                  ? 'Event is Full'
                  : 'Join Event'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}