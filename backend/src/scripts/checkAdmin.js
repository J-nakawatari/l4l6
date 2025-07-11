const mongoose = require('mongoose');
require('dotenv').config();

// Adminスキーマ
const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin'],
    default: 'admin',
  },
  permissions: [{
    type: String,
    enum: ['users:read', 'users:write', 'users:delete', 'system:manage'],
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: Date,
  twoFactorSecret: String,
}, {
  timestamps: true,
});

const Admin = mongoose.model('Admin', AdminSchema);

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier');
    
    const admins = await Admin.find({});
    console.log('管理者アカウント数:', admins.length);
    
    admins.forEach(admin => {
      console.log('---');
      console.log('Email:', admin.email);
      console.log('Name:', admin.name);
      console.log('Role:', admin.role);
      console.log('isActive:', admin.isActive);
      console.log('Created:', admin.createdAt);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmins();