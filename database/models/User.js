/**
 * database/models/User.js
 *
 * Base identity/auth model shared by all roles (STUDENT, TEACHER, ADMIN).
 * Role-specific academic data lives in Student.js / Teacher.js, referencing
 * this document by `user` (see those files).
 *
 * Password hashing happens HERE, server-side, via a pre-save Mongoose hook.
 * Frontend must never hash passwords; it only sends plaintext over HTTPS
 * and the backend (using this model) takes care of hashing/comparison.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned by default in queries
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
      default: 'STUDENT',
    },
    profile: {
      phone: { type: String, trim: true },
      avatarUrl: { type: String, trim: true },
      address: { type: String, trim: true },
      dateOfBirth: { type: Date },
      gender: {
        type: String,
        enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

// Hash password before saving, only if it was modified/new.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare plaintext password against stored hash.
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip sensitive fields when converting to JSON (API responses).
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
