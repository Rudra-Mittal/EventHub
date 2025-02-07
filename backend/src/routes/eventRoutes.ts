import express from 'express';
import { protect } from '../middleware/auth';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  searchEvents,
} from '../controllers/eventController';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.get('/search', searchEvents);
router.post('/', protect, upload.single('image'), createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.put('/:id', protect, updateEvent);
router.delete('/:id', protect, deleteEvent);
router.post('/:id/join', protect, joinEvent);
router.post('/:id/leave', protect, leaveEvent);

export default router;