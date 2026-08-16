/**
 * database/models/Result.js
 * A student's marks/grade for a given Exam.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

function computeGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

const resultSchema = new Schema(
  {
    exam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B', 'C', 'D', 'F'],
    },
  },
  { timestamps: true }
);

resultSchema.index({ exam: 1, student: 1 }, { unique: true });

// Auto-derive grade from marks/maxMarks if not explicitly provided.
resultSchema.pre('save', async function autoGrade(next) {
  if (this.grade) return next();
  try {
    const Exam = mongoose.model('Exam');
    const exam = await Exam.findById(this.exam).select('maxMarks').lean();
    if (exam && exam.maxMarks) {
      const percentage = (this.marks / exam.maxMarks) * 100;
      this.grade = computeGrade(percentage);
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.models.Result || mongoose.model('Result', resultSchema);
module.exports.computeGrade = computeGrade;
