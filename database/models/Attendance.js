/**
 * database/models/Attendance.js
 * One record per student per class per date.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ATTENDANCE_STATUS = ['PRESENT', 'ABSENT'];

const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUS,
      required: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance entries for the same student/course/day.
attendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
module.exports.ATTENDANCE_STATUS = ATTENDANCE_STATUS;
