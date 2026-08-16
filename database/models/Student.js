/**
 * database/models/Student.js
 * Academic profile for a user with role STUDENT.
 * One-to-one with User via `user` reference.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    guardian: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relation: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'GRADUATED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

studentSchema.index({ department: 1, year: 1, section: 1 });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
