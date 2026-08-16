/**
 * database/models/Enrollment.js
 * Links a Student to a Course they are enrolled in.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const enrollmentSchema = new Schema(
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
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'DROPPED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// A student can only be enrolled once in the same course.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
