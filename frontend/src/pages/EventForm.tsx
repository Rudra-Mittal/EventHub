import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as api from '../api';
import { motion } from 'framer-motion';
import { AlertCircle, Upload } from 'lucide-react';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  category: z.string().min(1, 'Category is required'),
  maxAttendees: z.number().min(1, 'Maximum attendees must be at least 1'),
});

type EventFormData = z.infer<typeof eventSchema>;

const categories = ['Conference', 'Workshop', 'Meetup', 'Social', 'Other'];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 }
  }
};

export default function EventForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isEditForm = location.pathname.endsWith('/edit');
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      maxAttendees: 1,
    },
  });
  if(isEditForm){
    useEffect(()=>{
      api.getEvent(id!).then((res) => {
        console.log(res.data);
      reset({
        title: res.data.title,
        description: res.data.description,
        date: new Date(res.data.date).toISOString().split('T')[0],
        location: res.data.location,
        category: res.data.category,
        maxAttendees: res.data.maxAttendees,
      });
      if (res.data.imageUrl) {
        setImagePreview(res.data.imageUrl);
      }
      })
    },[])
  }

  const createMutation = useMutation({
    mutationFn: (data: EventFormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      return api.createEvent(formData);
    },
    onSuccess: () => {
      navigate('/');
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'An error occurred');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EventFormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      return api.updateEvent(id!, formData);
    },
    onSuccess: () => {
      navigate(`/events/${id}`);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'An error occurred');
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: EventFormData) => {
    if (id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const FormField = ({ label, children, error }: any) => (
    <motion.div variants={itemVariants} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && (
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-sm text-red-600 flex items-center gap-1"
        >
          <AlertCircle size={14} />
          {error}
        </motion.p>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <motion.div 
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div 
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-8 py-6 border-b border-gray-100">
            <motion.h1 
              className="text-2xl font-semibold text-gray-900"
              variants={itemVariants}
            >
              {id ? 'Edit Event' : 'Create New Event'}
            </motion.h1>
            <motion.p 
              className="mt-2 text-sm text-gray-600"
              variants={itemVariants}
            >
              Fill in the details below to {id ? 'update your' : 'create a new'} event.
            </motion.p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">
            {error && (
              <motion.div 
                className="rounded-lg bg-red-50 p-4 border border-red-100"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center text-red-700">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}

            <FormField label="Event Image">
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative"
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white w-6 h-6 flex items-center justify-center shadow-lg"
                    >
                      ×
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                    whileHover={{ borderColor: '#6366f1', backgroundColor: '#f5f5f5' }}
                  >
                    <Upload className="h-6 w-6 text-gray-400" />
                  </motion.div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended: Square image, maximum 5MB
                  </p>
                </div>
              </div>
            </FormField>

            <FormField label="Title" error={errors.title?.message}>
              <input
                type="text"
                {...register('title')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
            </FormField>

            <FormField label="Description" error={errors.description?.message}>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Date" error={errors.date?.message}>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </FormField>

              <FormField label="Location" error={errors.location?.message}>
                <input
                  type="text"
                  {...register('location')}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </FormField>

              <FormField label="Category" error={errors.category?.message}>
                <select
                  {...register('category')}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Maximum Attendees" error={errors.maxAttendees?.message}>
                <input
                  type="number"
                  {...register('maxAttendees', { valueAsNumber: true })}
                  min="1"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </FormField>
            </div>

            <motion.div 
              className="flex justify-end mt-8"
              variants={itemVariants}
            >
              <motion.button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-lg"
                whileHover={{ scale: 1.02, backgroundColor: "#4338ca" }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {id ? 'Update Event' : 'Create Event'}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}