import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { socket, joinEventRoom, leaveEventRoom } from '../services/socket';

export default function SearchEvents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', 'search', searchTerm, location],
    queryFn: () =>
      api
        .searchEvents({
          search: searchTerm,
          location: location,
        })
        .then((res) => res.data),
  });

  // Join socket rooms for all visible events
  useEffect(() => {
    events.forEach((event: { _id: string; }) => {
      joinEventRoom(event._id);
    });

    // Listen for attendee updates
    socket.on('attendeeUpdate', (updatedEvent: Event) => {
      // Update the event in the search results
      queryClient.setQueryData(['events', 'search', searchTerm, location], 
        (oldEvents: Event[] | undefined) => {
          if (!oldEvents) return oldEvents;
          return oldEvents.map((event) =>
            event._id === updatedEvent._id ? updatedEvent : event
          );
        }
      );
    });

    return () => {
      // Clean up socket connections
      events.forEach((event: { _id: string; }) => {
        leaveEventRoom(event._id);
      });
      socket.off('attendeeUpdate');
    };
  }, [events, queryClient, searchTerm, location]);

  const joinMutation = useMutation({
    mutationFn: (eventId: string) => api.joinEvent(eventId),
  });

  const leaveMutation = useMutation({
    mutationFn: (eventId: string) => api.leaveEvent(eventId),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Search Events</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => {
            const isAttending = event.attendees.some(
              (attendee) => attendee._id === auth.user?._id
            );
            const isFull = event.attendees.length >= event.maxAttendees;
            const isCreator = auth.user?._id === event.creator._id;

            return (
              <div
                key={event._id}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <Link to={`/events/${event._id}`}>
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {format(new Date(event.date), 'PPP')}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{event.location}</p>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {event.category}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {event.attendees.length}/{event.maxAttendees} attendees
                      </span>
                    </div>
                  </div>
                </Link>
                {auth.user && !isCreator && (
                  <div className="px-4 py-3 bg-gray-50 text-right">
                    <button
                      onClick={() => {
                        if (isAttending) {
                          leaveMutation.mutate(event._id);
                        } else {
                          joinMutation.mutate(event._id);
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}