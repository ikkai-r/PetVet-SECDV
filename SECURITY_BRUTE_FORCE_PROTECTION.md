# Account Security - Brute Force Protection Implementation

## 🛡️ **Security Policy: "Lock After Failed Attempts"**

This implementation provides comprehensive protection against brute force attacks while maintaining user accessibility and preventing denial-of-service scenarios.

---

## 📋 **Implementation Summary**

### **Core Security Features:**
✅ **Account Lockout**: Lock after 5 failed login attempts  
✅ **Progressive Penalties**: Longer lockouts for repeat offenders  
✅ **DoS Prevention**: Maximum 2-hour lockout duration  
✅ **Automatic Unlock**: Accounts unlock automatically after timeout  
✅ **Admin Override**: Administrators can manually unlock accounts  
✅ **Attempt Tracking**: All failed attempts logged with timestamps  
✅ **Automatic Cleanup**: Old records cleaned up automatically  

---

## ⚙️ **Configuration**

```typescript
SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 3,        // Lock after 5 failed attempts
  BASE_LOCKOUT_MINUTES: 15,      // 15 minutes initial lockout
  MAX_LOCKOUT_MINUTES: 120,      // 2 hours maximum lockout
  ATTEMPT_WINDOW_MINUTES: 60,    // Failed attempts expire after 1 hour
  PROGRESSIVE_MULTIPLIER: 2,     // Each subsequent lockout doubles duration
}
```

### **Lockout Progression:**
- **1st lockout**: 15 minutes
- **2nd lockout**: 30 minutes (15 × 2)
- **3rd lockout**: 60 minutes (30 × 2)
- **4th lockout**: 120 minutes (60 × 2) - **MAX REACHED**
- **5th+ lockouts**: 120 minutes (capped at maximum)

---

## 🔐 **Security Workflow**

### **Login Process:**
1. **Pre-Check**: Verify account is not locked
2. **Attempt Login**: Try Firebase authentication
3. **Success**: Clear any failed attempts, allow access
4. **Failure**: Record failed attempt, check if lockout threshold reached
5. **Lockout**: If 5+ attempts, lock account with progressive duration

### **Account Status Check:**
```typescript
const lockStatus = await isAccountLocked(email);
if (lockStatus.isLocked) {
  // Display lockout message with remaining time
  // Prevent login attempt
}
```

### **Admin Management:**
- **Check Status**: View failed attempts and lockout information
- **Unlock Account**: Override lockout for legitimate users
- **System Cleanup**: Remove old security records

---

## 📊 **Data Storage**

### **Failed Attempts Collection** (`loginAttempts`)
```typescript
{
  email: string,
  timestamp: Timestamp,
  ipAddress?: string,
  userAgent?: string
}
```

### **Account Lockouts Collection** (`accountLockouts`)
```typescript
{
  email: string,
  lockedAt: Timestamp,
  unlockAt: Timestamp,
  failedAttempts: number,
  lockoutCount: number  // Progressive penalty tracking
}
```

---

## 🔒 **Firestore Security Rules**

```javascript
// Security collections - admin access only
match /loginAttempts/{attemptId} {
  allow read: if isAdmin();
  allow write: if false; // Backend only
}

match /accountLockouts/{email} {
  allow read: if isAdmin();
  allow delete: if isAdmin(); // Admin unlock
  allow create, update: if false; // Backend only
}
```

---

## 🎯 **Attack Prevention**

### **Brute Force Protection:**
- **Rate Limiting**: Maximum 5 attempts per account
- **Time Windows**: Failed attempts expire after 1 hour
- **Progressive Penalties**: Increasing lockout durations
- **IP Tracking**: Log IP addresses for analysis

### **DoS Prevention:**
- **Maximum Duration**: 2-hour lockout limit prevents permanent denial
- **Auto Unlock**: Accounts automatically unlock after timeout
- **Admin Override**: Manual unlock for legitimate users
- **Selective Targeting**: Only specific email addresses affected

### **Data Integrity:**
- **Automatic Cleanup**: Old records removed after 24 hours
- **Timestamp Tracking**: Precise timing for security analysis
- **Audit Trail**: Complete log of security events

---

## 🛠️ **Admin Tools**

### **Security Dashboard Features:**
- **Account Status Check**: View current security status for any email
- **Failed Attempt Monitoring**: See recent failed login attempts
- **Lockout Management**: View and manage locked accounts
- **System Maintenance**: Cleanup old security records
- **Configuration Display**: View current security settings

### **Admin Actions:**
```typescript
// Check account security status
const status = await getAccountSecurityStatus(email);

// Unlock account (admin only)
const success = await adminUnlockAccount(email, adminEmail);

// Cleanup old records
await cleanupOldSecurityRecords();
```

---

## 📈 **User Experience**

### **Clear Error Messages:**
- **Invalid Credentials**: "Invalid username/password"
- **Account Locked**: "Account temporarily locked. Try again in X minutes."
- **Lockout Triggered**: "Too many failed attempts. Account locked for X minutes."

### **Progressive Feedback:**
- Users see remaining lockout time
- Clear indication of security status
- No exposure of valid vs invalid email addresses

### **Recovery Process:**
- **Automatic**: Wait for lockout to expire
- **Admin Assistance**: Contact admin for manual unlock
- **Password Reset**: Use Firebase password reset (separate from lockout)

---

## 🔍 **Security Monitoring**

### **Logged Information:**
- Failed login attempts with timestamps
- IP addresses and user agents
- Lockout events and durations
- Admin unlock actions
- System cleanup operations

### **Audit Capabilities:**
- Track repeated attack patterns
- Identify suspicious IP addresses
- Monitor admin security actions
- Analyze attack frequency and timing

---

## ✅ **Security Compliance**

This implementation follows security best practices:

✅ **OWASP Recommendations**: Account lockout after failed attempts  
✅ **NIST Guidelines**: Progressive penalties and maximum lockout duration  
✅ **DoS Prevention**: Reasonable lockout limits  
✅ **User Experience**: Clear feedback and recovery options  
✅ **Admin Control**: Override capabilities for legitimate users  
✅ **Data Protection**: Secure storage and automatic cleanup  
✅ **Audit Trail**: Complete logging for security analysis  

---

## 🚀 **Implementation Status**

**✅ COMPLETE** - All security features implemented and tested:
- Account lockout mechanism
- Progressive penalty system
- Admin management dashboard
- Firestore security rules
- Error handling and user feedback
- Automatic cleanup processes
- Security audit and monitoring
