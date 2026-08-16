/**
 * database/models/Teacher.js
 * Academic profile for a user with role TEACHER.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const teacherSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    teacherId: {
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
    designation: {
      type: String,
      trim: true,
      default: 'Faculty',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

teacherSchema.index({ department: 1 });

module.exports = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
