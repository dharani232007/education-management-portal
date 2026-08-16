/**
 * database/models/Exam.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const examSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    examType: {
      type: String,
      enum: ['INTERNAL', 'MIDTERM', 'FINAL', 'QUIZ'],
      default: 'INTERNAL',
    },
    date: {
      type: Date,
      required: true,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
  },
  { timestamps: true }
);

examSchema.index({ course: 1, date: 1 });

module.exports = mongoose.models.Exam || mongoose.model('Exam', examSchema);
