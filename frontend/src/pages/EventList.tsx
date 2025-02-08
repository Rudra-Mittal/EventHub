"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import * as api from "../api"
import type { Event } from "../types"
import { socket, joinEventRoom, leaveEventRoom } from "../services/socket"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

const categories = ["All", "Conference", "Workshop", "Meetup", "Social", "Other"]

export default function EventList() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedDate, setSelectedDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const queryClient = useQueryClient()
  const { auth } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ["events", selectedCategory, selectedDate, currentPage],
    queryFn: () =>
      api
        .getEvents({
          category: selectedCategory === "All" ? undefined : selectedCategory,
          date: selectedDate,
          page: currentPage,
          limit: 9,
        })
        .then((res) => res.data),
  })

  const events = data?.events || []
  const pagination = data?.pagination

  // Filter and sort events
  const filteredAndSortedEvents = events
    .filter((event: { title: string; description: string; location: string }) => {
      const matchesSearch = searchTerm
        ? event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      return matchesSearch
    })
    .sort((a: { date: string | number | Date }, b: { date: string | number | Date }) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

  // Listen for real-time updates
  useEffect(() => {
    // Join socket rooms for all visible events
    events.forEach((event: { _id: string }) => {
      joinEventRoom(event._id)
    })

    // Listen for event updates
    socket.on("eventUpdated", (updatedEvent: Event) => {
      queryClient.setQueryData(["events", selectedCategory, selectedDate, currentPage], (oldData: any) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          events: oldData.events.map((event: Event) => (event._id === updatedEvent._id ? updatedEvent : event)),
        }
      })
    })

    // Listen for event deletions
    socket.on("eventDeleted", (deletedEventId: string) => {
      queryClient.setQueryData(["events", selectedCategory, selectedDate, currentPage], (oldData: any) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          events: oldData.events.filter((event: Event) => event._id !== deletedEventId),
        }
      })
    })

    // Listen for new events
    socket.on("eventCreated", (newEvent: Event) => {
      queryClient.setQueryData(["events", selectedCategory, selectedDate, currentPage], (oldData: any) => {
        if (!oldData) return { events: [newEvent], pagination: { currentPage: 1, totalPages: 1 } }
        return {
          ...oldData,
          events: [...oldData.events, newEvent],
        }
      })
    })

    // Listen for attendee updates
    socket.on("attendeeUpdate", (updatedEvent: Event) => {
      queryClient.setQueryData(["events", selectedCategory, selectedDate, currentPage], (oldData: any) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          events: oldData.events.map((event: Event) => (event._id === updatedEvent._id ? updatedEvent : event)),
        }
      })
    })

    return () => {
      // Cleaning  up socket connections
      events.forEach((event: { _id: string }) => {
        leaveEventRoom(event._id)
      })
      socket.off("eventUpdated")
      socket.off("eventDeleted")
      socket.off("eventCreated")
      socket.off("attendeeUpdate")
    }
  }, [events, queryClient, selectedCategory, selectedDate, currentPage])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-50 to-blue-100">
        <motion.div
          className="w-16 h-16 border-t-4 border-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-r from-blue-50 to-blue-100 text-gray-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex flex-col space-y-4 mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex space-x-4">
              <motion.select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-700"
                whileTap={{ scale: 0.95 }}
                style={{ WebkitAppearance: "none" }}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </motion.select>
              <motion.input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-700"
                whileTap={{ scale: 0.95 }}
              />
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/events/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Create Event
              </Link>
            </motion.div>
          </motion.div>
          <motion.div
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
            whileHover={{ scale: 1.02 }}
          >
            <motion.input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-700"
              whileFocus={{ scale: 1.05 }}
            />
            <motion.button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sort by Date {sortOrder === "asc" ? "↑" : "↓"}
            </motion.button>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {filteredAndSortedEvents.map((event: Event) => {
              const isUserEvent =
                auth.user &&
                (event.creator._id === auth.user._id ||
                  event.attendees.some((attendee) => attendee._id === auth.user?._id))

              return (
                <motion.div
                  key={event._id}
                  variants={{
                    hidden: { opacity: 0, y: 50 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.05, boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to={`/events/${event._id}`}
                    className={`block transition-all duration-300 ${isUserEvent ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <motion.div
                      className="bg-white overflow-hidden shadow-lg rounded-lg"
                      whileHover={{
                        boxShadow: "0px 0px 8px rgba(59, 130, 246, 0.5)",
                      }}
                    >
                      {event.imageUrl && (
                        <img
                          src={event.imageUrl || "/placeholder.svg"}
                          alt={event.title}
                          className="h-48 w-full object-cover"
                        />
                      )}
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{event.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">{format(new Date(event.date), "PPP")}</p>
                        <p className="mt-1 text-sm text-gray-500">{event.location}</p>
                        <div className="mt-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {event.category}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            {event.attendees.length}/{event.maxAttendees} attendees
                          </span>
                        </div>
                        {isUserEvent && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {event.creator._id === auth.user?._id ? "Your Event" : "Joined"}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        {pagination && (
          <motion.div
            className="mt-8 flex justify-center space-x-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={!pagination.hasPrevPage}
              className={`px-4 py-2 rounded-md ${
                pagination.hasPrevPage
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              } transition-colors duration-200`}
              whileHover={pagination.hasPrevPage ? { scale: 1.05 } : {}}
              whileTap={pagination.hasPrevPage ? { scale: 0.95 } : {}}
            >
              Previous
            </motion.button>
            <motion.span
              className="px-4 py-2 text-gray-700 font-medium bg-white rounded-md shadow-sm"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
            >
              Page {pagination.currentPage} of {pagination.totalPages}
            </motion.span>
            <motion.button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={!pagination.hasNextPage}
              className={`px-4 py-2 rounded-md ${
                pagination.hasNextPage
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              } transition-colors duration-200`}
              whileHover={pagination.hasNextPage ? { scale: 1.05 } : {}}
              whileTap={pagination.hasNextPage ? { scale: 0.95 } : {}}
            >
              Next
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

