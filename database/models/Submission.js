/**
 * database/models/Submission.js
 * A student's submission for a given Assignment, plus teacher evaluation.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const submissionSchema = new Schema(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    content: {
      type: String, // free-text answer OR description accompanying a file
      trim: true,
      default: '',
    },
    fileUrl: {
      type: String, // reference to stored file, if file upload is supported
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    marks: {
      type: Number,
      min: 0,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'LATE', 'EVALUATED', 'MISSING'],
      default: 'SUBMITTED',
    },
    evaluatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// A student can only submit once per assignment.
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
