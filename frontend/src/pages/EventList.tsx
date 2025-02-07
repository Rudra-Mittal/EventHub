import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { Event } from '../types';
import { socket, joinEventRoom, leaveEventRoom } from '../services/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const categories = ['All', 'Conference', 'Workshop', 'Meetup', 'Social', 'Other'];

export default function EventList() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { auth } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['events', selectedCategory, selectedDate, currentPage],
    queryFn: () =>
      api
        .getEvents({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          date: selectedDate,
          page: currentPage,
          limit: 9,
        })
        .then((res) => res.data),
  });

  const events = data?.events || [];
  const pagination = data?.pagination;

  // Filter and sort events
  const filteredAndSortedEvents = events
    .filter((event) => {
      const matchesSearch = searchTerm
        ? event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  // Listen for real-time updates
  useEffect(() => {
    // Join socket rooms for all visible events
    events.forEach((event) => {
      joinEventRoom(event._id);
    });

    // Listen for event updates
    socket.on('eventUpdated', (updatedEvent: Event) => {
      queryClient.setQueryData(['events', selectedCategory, selectedDate, currentPage], 
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            events: oldData.events.map((event: Event) =>
              event._id === updatedEvent._id ? updatedEvent : event
            )
          };
        }
      );
    });

    // Listen for event deletions
    socket.on('eventDeleted', (deletedEventId: string) => {
      queryClient.setQueryData(['events', selectedCategory, selectedDate, currentPage], 
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            events: oldData.events.filter((event: Event) => event._id !== deletedEventId)
          };
        }
      );
    });

    // Listen for new events
    socket.on('eventCreated', (newEvent: Event) => {
      queryClient.setQueryData(['events', selectedCategory, selectedDate, currentPage], 
        (oldData: any) => {
          if (!oldData) return { events: [newEvent], pagination: { currentPage: 1, totalPages: 1 } };
          return {
            ...oldData,
            events: [...oldData.events, newEvent]
          };
        }
      );
    });

    // Listen for attendee updates
    socket.on('attendeeUpdate', (updatedEvent: Event) => {
      queryClient.setQueryData(['events', selectedCategory, selectedDate, currentPage], 
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            events: oldData.events.map((event: Event) =>
              event._id === updatedEvent._id ? updatedEvent : event
            )
          };
        }
      );
    });

    return () => {
      // Clean up socket connections
      events.forEach((event) => {
        leaveEventRoom(event._id);
      });
      socket.off('eventUpdated');
      socket.off('eventDeleted');
      socket.off('eventCreated');
      socket.off('attendeeUpdate');
    };
  }, [events, queryClient, selectedCategory, selectedDate, currentPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <Link
            to="/events/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Event
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sort by Date {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedEvents.map((event: Event) => {
          const isUserEvent = auth.user && (
            event.creator._id === auth.user._id ||
            event.attendees.some(attendee => attendee._id === auth.user?._id)
          );

          return (
            <Link
              key={event._id}
              to={`/events/${event._id}`}
              className={`block hover:shadow-lg transition-shadow duration-200 ${
                isUserEvent ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <div className="bg-white overflow-hidden shadow rounded-lg">
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
                  {isUserEvent && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {event.creator._id === auth.user?._id ? 'Your Event' : 'Joined'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="mt-8 flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={!pagination.hasPrevPage}
            className={`px-4 py-2 rounded-md ${
              pagination.hasPrevPage
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={!pagination.hasNextPage}
            className={`px-4 py-2 rounded-md ${
              pagination.hasNextPage
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}