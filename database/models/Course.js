/**
 * database/models/Course.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    department: {
      type: String,
      trim: true,
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 3,
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

courseSchema.index({ teacher: 1 });

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
