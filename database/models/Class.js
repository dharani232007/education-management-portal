/**
 * database/models/Class.js
 * A scheduled section/batch that teaches a Course to a group of Students.
 * Attendance is recorded per Class (see Attendance.js).
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const classSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    schedule: {
      days: [{ type: String, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] }],
      startTime: { type: String, trim: true }, // e.g. "09:00"
      endTime: { type: String, trim: true },
    },
    room: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

classSchema.index({ course: 1, teacher: 1 });

module.exports = mongoose.models.Class || mongoose.model('Class', classSchema);
