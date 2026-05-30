# Technical Design Document: Skoolific V2 Upgrade

## Overview

Skoolific V2 represents a comprehensive architectural transformation of the existing school management system from a web-based application to a multi-platform solution with native desktop and mobile applications. The system serves 4 schools in Ethiopia with zero data loss during migration while introducing AI-powered test generation, multi-branch architecture, offline-first capabilities, and Ethiopian calendar integration.

### Design Goals

1. **Multi-Platform Native Experience**: Transform web application into native desktop (Tauri) and mobile (React Native/Capacitor) applications
2. **Zero Data Loss Migration**: Seamlessly migrate existing V1 data from 4 deployed schools to V2 architecture
3. **AI-Powered Assessment**: Integrate Google Gemini API for automated test generation with Ethiopian curriculum context
4. **Multi-Branch Support**: Enable school owners to manage multiple branches with independent databases and aggregated reporting
5. **Offline-First Architecture**: Support unreliable internet connectivity common in Ethiopian schools
6. **Cultural Appropriateness**: Full Ethiopian calendar integration and simplified UI for Ethiopian users
7. **Enhanced Security**: Implement comprehensive security measures including authentication, authorization, and data protection
8. **Performance Optimization**: Significantly improve load times, response times, and overall system responsiveness

### Technology Stack

- **Frontend Framework**: React.js (shared across all platforms)
- **Desktop Framework**: Tauri 2.0 (Rust-based, lightweight alternative to Electron)
- **Mobile Framework**: Capacitor (recommended over React Native for web code reuse)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (separate instance per branch)
- **AI Service**: Google Gemini API (gemini-1.5-pro or gemini-1.5-flash)
- **Ethiopian Calendar**: ethiopian-calendar-date-converter npm package
- **Offline Storage**: IndexedDB with Dexie.js wrapper
- **Notifications**: Firebase Cloud Messaging (push), Telegram Bot API, SMS gateway integration
- **State Management**: React Context API with local storage persistence
- **API Communication**: Axios with retry logic and offline queue

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
├──────────────────┬──────────────────┬──────────────────────────┤
│   Admin_App      │  Super_Admin_App │   Staff/Student/         │
│   (Tauri Desktop)│  (Tauri/Mobile)  │   Guardian_App (Mobile)  │
└────────┬─────────┴────────┬─────────┴──────────┬───────────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  API Gateway   │
                    │  (Express.js)  │
                    └───────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌─────▼──────┐    ┌─────▼──────┐
    │ Branch1 │      │  Branch2   │    │  Branch3   │
    │   DB    │      │     DB     │    │     DB     │
    │(iqrab3) │      │ (almarkaz) │    │(alkhwarizm)│
    └─────────┘      └────────────┘    └────────────┘
```

### Multi-Branch Database Architecture

**Design Decision**: Separate database per branch (database-per-tenant pattern)

**Rationale**:
- Complete data isolation between branches
- Independent scaling per branch
- Simplified backup and restore per branch
- Easier compliance with data residency requirements
- No risk of cross-branch data leakage

**Branch Code System**:
- Branch code derived from database name: first letter + last two characters
- Example: "iqrab3" → branch code "ib3"
- Branch code required before authentication
- Session maintains branch context throughout user interaction

**Connection Management**:
```javascript
// Backend connection pool manager
class DatabaseConnectionManager {
  constructor() {
    this.pools = new Map();
  }
  
  getPool(branchCode) {
    if (!this.pools.has(branchCode)) {
      const dbName = this.resolveDatabaseName(branchCode);
      this.pools.set(branchCode, new Pool({
        host: process.env.DB_HOST,
        database: dbName,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000
      }));
    }
    return this.pools.get(branchCode);
  }
}
```


### Centralized API Configuration

**Backend API Config** (`backend/config/api.config.js`):
```javascript
module.exports = {
  server: {
    host: process.env.API_HOST || 'localhost',
    port: process.env.API_PORT || 3000,
    protocol: process.env.API_PROTOCOL || 'http'
  },
  endpoints: {
    auth: '/api/v2/auth',
    students: '/api/v2/students',
    staff: '/api/v2/staff',
    finance: '/api/v2/finance',
    academic: '/api/v2/academic',
    hr: '/api/v2/hr',
    communication: '/api/v2/communication',
    aiTests: '/api/v2/ai-tests',
    reports: '/api/v2/reports'
  },
  getBaseURL() {
    return `${this.server.protocol}://${this.server.host}:${this.server.port}`;
  },
  getEndpoint(name) {
    return `${this.getBaseURL()}${this.endpoints[name]}`;
  }
};
```

**Frontend API Config** (`frontend/src/config/api.config.js`):
```javascript
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  endpoints: {
    auth: '/api/v2/auth',
    students: '/api/v2/students',
    staff: '/api/v2/staff',
    finance: '/api/v2/finance',
    academic: '/api/v2/academic',
    hr: '/api/v2/hr',
    communication: '/api/v2/communication',
    aiTests: '/api/v2/ai-tests',
    reports: '/api/v2/reports'
  }
};

export default API_CONFIG;
```

**Usage Pattern**:
```javascript
import API_CONFIG from '@/config/api.config';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout
});

// Making requests
apiClient.get(`${API_CONFIG.endpoints.students}/list`);
```

## Components and Interfaces

### 1. Native Desktop Application (Tauri)

**Admin_App Architecture**:

```
┌─────────────────────────────────────────┐
│         Tauri Window (Rust Core)        │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   React Frontend (WebView)        │ │
│  │                                   │ │
│  │  - Dashboard                      │ │
│  │  - Task Pages (Setup Workflow)    │ │
│  │  - Student Management             │ │
│  │  - Staff Management               │ │
│  │  - Finance Module                 │ │
│  │  - Academic Module                │ │
│  │  - HR Module                      │ │
│  │  - Communication                  │ │
│  │  - Settings                       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Tauri Commands (Rust Backend)   │ │
│  │                                   │ │
│  │  - Secure Credential Storage      │ │
│  │  - File System Access             │ │
│  │  - Native Notifications           │ │
│  │  - System Tray Integration        │ │
│  │  - Auto-Update Mechanism          │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Tauri Commands**:
```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn save_credentials(username: String, password: String, branch_code: String) -> Result<(), String> {
    // Use OS keychain for secure storage
    keyring::Entry::new("skoolific", &username)
        .set_password(&password)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_credentials(username: String) -> Result<(String, String), String> {
    // Retrieve from OS keychain
    let password = keyring::Entry::new("skoolific", &username)
        .get_password()
        .map_err(|e| e.to_string())?;
    Ok((username, password))
}

#[tauri::command]
async fn show_notification(title: String, body: String) -> Result<(), String> {
    // Native system notification
    tauri::api::notification::Notification::new("com.skoolific.admin")
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}
```

**Super_Admin_App Architecture**:
- Same Tauri structure as Admin_App
- Additional cross-branch data aggregation layer
- Connects to multiple databases simultaneously
- Provides consolidated reporting dashboard

### 2. Native Mobile Applications (Capacitor)

**Capacitor Configuration** (`capacitor.config.ts`):
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skoolific.staff', // or student, guardian
  appName: 'Skoolific Staff',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
```

**Staff_App Role-Based UI**:
```javascript
// Role-based feature access
const ROLE_FEATURES = {
  Teacher: [
    'mark-lists',
    'attendance',
    'exam-creation',
    'class-management',
    'schedule-view',
    'student-reports'
  ],
  Administrative: [
    'student-registration',
    'fee-management',
    'reports',
    'communication'
  ],
  Supportive: [
    'attendance-view',
    'schedule-view',
    'communication'
  ]
};

function StaffApp() {
  const { user } = useAuth();
  const features = ROLE_FEATURES[user.staffType] || [];
  
  return (
    <NavigationContainer>
      {features.includes('mark-lists') && <MarkListsScreen />}
      {features.includes('exam-creation') && <ExamCreationScreen />}
      {/* ... other conditional features */}
    </NavigationContainer>
  );
}
```

**Persistent Login Implementation**:
```javascript
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

class AuthService {
  async saveCredentials(username, password, branchCode) {
    await SecureStoragePlugin.set({
      key: 'auth_credentials',
      value: JSON.stringify({ username, password, branchCode })
    });
  }
  
  async getCredentials() {
    const result = await SecureStoragePlugin.get({ key: 'auth_credentials' });
    return JSON.parse(result.value);
  }
  
  async autoLogin() {
    try {
      const credentials = await this.getCredentials();
      return await this.login(credentials);
    } catch (error) {
      return null; // No saved credentials
    }
  }
}
```


### 3. Ethiopian Calendar Integration

**Calendar Utility Module** (`utils/ethiopianCalendar.js`):
```javascript
import EthiopianDate from 'ethiopian-calendar-date-converter';

class EthiopianCalendarService {
  /**
   * Convert Gregorian date to Ethiopian date
   * @param {Date} gregorianDate - JavaScript Date object
   * @returns {Object} Ethiopian date {year, month, day}
   */
  toEthiopian(gregorianDate) {
    const year = gregorianDate.getFullYear();
    const month = gregorianDate.getMonth() + 1;
    const day = gregorianDate.getDate();
    
    return EthiopianDate.toEthiopian(year, month, day);
  }
  
  /**
   * Convert Ethiopian date to Gregorian date
   * @param {number} year - Ethiopian year
   * @param {number} month - Ethiopian month (1-13)
   * @param {number} day - Ethiopian day
   * @returns {Date} JavaScript Date object
   */
  toGregorian(year, month, day) {
    const gregorian = EthiopianDate.toGregorian(year, month, day);
    return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
  }
  
  /**
   * Format Ethiopian date for display
   * @param {Object} ethDate - Ethiopian date {year, month, day}
   * @param {string} locale - Language code (am, en, etc.)
   * @returns {string} Formatted date string
   */
  format(ethDate, locale = 'en') {
    const monthNames = {
      en: ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
           'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'],
      am: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 
           'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን']
    };
    
    const months = monthNames[locale] || monthNames.en;
    return `${months[ethDate.month - 1]} ${ethDate.day}, ${ethDate.year}`;
  }
  
  /**
   * Get current Ethiopian date
   * @returns {Object} Current Ethiopian date
   */
  now() {
    return this.toEthiopian(new Date());
  }
  
  /**
   * Increment Ethiopian year (for year rollover)
   * @param {number} currentYear - Current Ethiopian year
   * @returns {number} Next Ethiopian year
   */
  incrementYear(currentYear) {
    return currentYear + 1;
  }
  
  /**
   * Get academic year string
   * @param {number} year - Ethiopian year
   * @returns {string} Academic year format "2018/2019"
   */
  getAcademicYear(year) {
    return `${year}/${year + 1}`;
  }
}

export default new EthiopianCalendarService();
```

**Integration in Components**:
```javascript
import EthiopianCalendar from '@/utils/ethiopianCalendar';

function AttendancePage() {
  const [currentDate, setCurrentDate] = useState(EthiopianCalendar.now());
  
  return (
    <div>
      <h2>Attendance - {EthiopianCalendar.format(currentDate, 'en')}</h2>
      {/* Rest of component */}
    </div>
  );
}
```

### 4. AI Test Generator Module

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                  AI Test Generator                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Teacher Interface                                 │ │
│  │  - Subject/Class/Term Selection                    │ │
│  │  - Question Type Distribution                      │ │
│  │  - Language Selection                              │ │
│  │  - Difficulty Level                                │ │
│  │  - Exam Description/Context                        │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Prompt Engineering Layer                          │ │
│  │  - PTCF Framework (Persona/Task/Context/Format)    │ │
│  │  - Ethiopian Curriculum Context Injection          │ │
│  │  - Question Type Templates                         │ │
│  │  - JSON Schema Definition                          │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Gemini API Integration                            │ │
│  │  - API Key Management                              │ │
│  │  - Request/Response Handling                       │ │
│  │  - Error Handling & Retry Logic                    │ │
│  │  - Rate Limiting                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Response Validation & Processing                  │ │
│  │  - JSON Schema Validation                          │ │
│  │  - Question Grouping by Type                       │ │
│  │  - Answer Key Extraction                           │ │
│  │  - Preview Generation                              │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Teacher Review & Approval                         │ │
│  │  - Preview Display                                 │ │
│  │  - Edit/Delete Questions                           │ │
│  │  - Manual Question Addition                        │ │
│  │  - Regenerate Option                               │ │
│  │  - Approve & Save                                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Gemini Prompt Template**:
```javascript
class GeminiPromptBuilder {
  buildExamPrompt(examConfig) {
    const {
      grade,
      subject,
      unit,
      language,
      questionTypes,
      difficulty,
      totalMarks,
      componentType
    } = examConfig;
    
    return `
**PERSONA**: You are an expert Ethiopian educator specializing in the Ethiopian National Curriculum, with deep knowledge of ${subject} for Grade ${grade}. You have extensive experience creating assessments that align with Ethiopian Ministry of Education standards.

**TASK**: Generate a ${componentType} examination for ${subject}, Grade ${grade}, ${unit} with the following specifications:
- Total Marks: ${totalMarks}
- Difficulty Level: ${difficulty}
- Language: ${language}
- Question Distribution: ${this.formatQuestionTypes(questionTypes)}

**CONTEXT**:
1. This exam is for Ethiopian students following the Ethiopian National Curriculum
2. All content must be factually accurate and aligned with standard Ethiopian textbooks
3. Questions should be culturally appropriate for Ethiopian context
4. Use only information from approved Ethiopian Ministry of Education materials
5. Ensure questions test understanding, not just memorization

**FORMAT**: Return your response as a JSON object with the following structure:
{
  "exam": {
    "title": "string",
    "instructions": "string",
    "totalMarks": number,
    "questions": [
      {
        "id": number,
        "type": "multiple_choice" | "true_false" | "matching" | "fill_blank" | "short_answer" | "essay" | "numeric",
        "question": "string",
        "marks": number,
        "options": ["string"] (for MCQ, matching),
        "correctAnswer": "string" | ["string"],
        "explanation": "string"
      }
    ]
  }
}

**REQUIREMENTS**:
1. Group all questions by type (all True/False together, all MCQ together, etc.)
2. Within each type, questions can be in any order
3. Ensure total marks sum to ${totalMarks}
4. Provide clear, unambiguous questions
5. Include detailed explanations for correct answers
6. For matching questions, ensure equal number of items in both columns
7. For fill-in-the-blank, use _____ to indicate blanks
8. Return ONLY valid JSON, no additional text

Generate the exam now.
`;
  }
  
  formatQuestionTypes(questionTypes) {
    return questionTypes.map(qt => 
      `${qt.count} ${qt.type} questions (${qt.marksEach} marks each)`
    ).join(', ');
  }
}
```

**Gemini API Integration**:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });
  }
  
  async generateExam(examConfig) {
    try {
      const promptBuilder = new GeminiPromptBuilder();
      const prompt = promptBuilder.buildExamPrompt(examConfig);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse and validate JSON response
      const examData = JSON.parse(text);
      this.validateExamStructure(examData);
      
      return examData;
    } catch (error) {
      if (error.message.includes('RATE_LIMIT')) {
        throw new Error('API rate limit exceeded. Please try again in a few moments.');
      } else if (error.message.includes('INVALID_API_KEY')) {
        throw new Error('Invalid Gemini API key. Please check configuration.');
      } else {
        throw new Error(`Exam generation failed: ${error.message}`);
      }
    }
  }
  
  validateExamStructure(examData) {
    if (!examData.exam || !examData.exam.questions) {
      throw new Error('Invalid exam structure returned from AI');
    }
    
    // Validate each question has required fields
    examData.exam.questions.forEach((q, index) => {
      if (!q.type || !q.question || !q.marks || !q.correctAnswer) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
    });
    
    return true;
  }
}
```


**Exam Publishing and Student Delivery**:
```javascript
class ExamPublishingService {
  async publishExam(examId, classId) {
    // 1. Get exam and student list
    const exam = await this.getExam(examId);
    const students = await this.getClassStudents(classId);
    
    // 2. Create randomized versions for each student
    const studentExams = students.map(student => ({
      studentId: student.id,
      examId: exam.id,
      questions: this.randomizeQuestions(exam.questions),
      startTime: null,
      endTime: null,
      status: 'pending'
    }));
    
    // 3. Save to database
    await this.saveStudentExams(studentExams);
    
    // 4. Send push notifications
    await this.notifyStudents(students, exam);
    
    return { published: true, studentCount: students.length };
  }
  
  randomizeQuestions(questions) {
    // Group by type first
    const grouped = this.groupByType(questions);
    
    // Shuffle within each group
    Object.keys(grouped).forEach(type => {
      grouped[type] = this.shuffleArray(grouped[type]);
    });
    
    // Flatten back to array
    return Object.values(grouped).flat();
  }
  
  groupByType(questions) {
    return questions.reduce((acc, q) => {
      if (!acc[q.type]) acc[q.type] = [];
      acc[q.type].push(q);
      return acc;
    }, {});
  }
  
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
```

**Auto-Grading Engine**:
```javascript
class AutoGradingService {
  async gradeExam(studentExamId, answers) {
    const studentExam = await this.getStudentExam(studentExamId);
    const results = {
      totalMarks: 0,
      earnedMarks: 0,
      questions: []
    };
    
    for (const question of studentExam.questions) {
      const studentAnswer = answers[question.id];
      const gradeResult = this.gradeQuestion(question, studentAnswer);
      
      results.questions.push(gradeResult);
      results.totalMarks += question.marks;
      results.earnedMarks += gradeResult.earnedMarks;
    }
    
    // Save results
    await this.saveGradingResults(studentExamId, results);
    
    // Add to mark list
    await this.addToMarkList(studentExam, results);
    
    // Notify student and guardian
    await this.notifyResults(studentExam, results);
    
    return results;
  }
  
  gradeQuestion(question, studentAnswer) {
    const result = {
      questionId: question.id,
      type: question.type,
      earnedMarks: 0,
      isCorrect: false,
      feedback: ''
    };
    
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
      case 'numeric':
        result.isCorrect = this.compareExact(question.correctAnswer, studentAnswer);
        result.earnedMarks = result.isCorrect ? question.marks : 0;
        break;
        
      case 'fill_blank':
        result.isCorrect = this.compareFillBlank(question.correctAnswer, studentAnswer);
        result.earnedMarks = result.isCorrect ? question.marks : 0;
        break;
        
      case 'matching':
        const matchScore = this.gradeMatching(question.correctAnswer, studentAnswer);
        result.earnedMarks = (matchScore / 100) * question.marks;
        result.isCorrect = matchScore === 100;
        break;
        
      case 'short_answer':
      case 'essay':
        result.earnedMarks = null; // Requires manual grading
        result.feedback = 'Pending manual grading';
        break;
    }
    
    if (!result.isCorrect && question.explanation) {
      result.feedback = question.explanation;
    }
    
    return result;
  }
  
  compareExact(correct, student) {
    return String(correct).toLowerCase().trim() === 
           String(student).toLowerCase().trim();
  }
  
  compareFillBlank(correct, student) {
    // Handle multiple blanks
    if (Array.isArray(correct)) {
      return correct.every((c, i) => 
        this.compareExact(c, student[i])
      );
    }
    return this.compareExact(correct, student);
  }
  
  gradeMatching(correct, student) {
    let correctCount = 0;
    Object.keys(correct).forEach(key => {
      if (correct[key] === student[key]) correctCount++;
    });
    return (correctCount / Object.keys(correct).length) * 100;
  }
}
```

### 5. Offline-First Architecture

**Offline Storage Strategy**:
```javascript
import Dexie from 'dexie';

class OfflineDatabase extends Dexie {
  constructor() {
    super('SkoolificOfflineDB');
    
    this.version(1).stores({
      students: '++id, studentId, name, class, syncStatus',
      attendance: '++id, date, studentId, status, syncStatus',
      marks: '++id, studentId, subject, term, marks, syncStatus',
      exams: '++id, examId, studentId, answers, syncStatus',
      posts: '++id, postId, content, media, syncStatus',
      syncQueue: '++id, endpoint, method, data, timestamp, retryCount'
    });
  }
}

const offlineDB = new OfflineDatabase();
```

**Sync Manager**:
```javascript
class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncAll();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  async queueOperation(endpoint, method, data) {
    await offlineDB.syncQueue.add({
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    if (this.isOnline) {
      this.syncAll();
    }
  }
  
  async syncAll() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    const queue = await offlineDB.syncQueue.toArray();
    
    for (const item of queue) {
      try {
        await this.syncItem(item);
        await offlineDB.syncQueue.delete(item.id);
      } catch (error) {
        // Increment retry count
        await offlineDB.syncQueue.update(item.id, {
          retryCount: item.retryCount + 1
        });
        
        // Remove if too many retries
        if (item.retryCount >= 5) {
          await offlineDB.syncQueue.delete(item.id);
          console.error('Sync failed after 5 retries:', item);
        }
      }
    }
    
    this.syncInProgress = false;
  }
  
  async syncItem(item) {
    const response = await fetch(`${API_CONFIG.baseURL}${item.endpoint}`, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify(item.data)
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  getToken() {
    return localStorage.getItem('authToken');
  }
}

const syncManager = new SyncManager();
```

**Offline-Aware API Client**:
```javascript
class OfflineAwareAPIClient {
  async request(endpoint, method, data) {
    if (!navigator.onLine) {
      // Queue for later sync
      await syncManager.queueOperation(endpoint, method, data);
      
      // Return optimistic response
      return {
        success: true,
        offline: true,
        message: 'Saved locally. Will sync when online.'
      };
    }
    
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(data)
      });
      
      return await response.json();
    } catch (error) {
      // Network error - queue for sync
      await syncManager.queueOperation(endpoint, method, data);
      
      return {
        success: true,
        offline: true,
        message: 'Network error. Saved locally for sync.'
      };
    }
  }
}
```


## Data Models

### Core Database Schema

**Branch Configuration Table**:
```sql
CREATE TABLE branch_config (
  id SERIAL PRIMARY KEY,
  branch_code VARCHAR(10) UNIQUE NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  database_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**School Configuration (Task1 Data)**:
```sql
CREATE TABLE school_config (
  id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL, -- "2018/2019"
  current_year INTEGER NOT NULL, -- 2018
  number_of_terms INTEGER NOT NULL,
  school_days JSONB NOT NULL, -- ["Monday", "Tuesday", ...]
  shift_count INTEGER NOT NULL, -- 1 or 2
  shift_rotation_enabled BOOLEAN DEFAULT FALSE,
  periods_per_shift INTEGER NOT NULL,
  period_duration_minutes INTEGER NOT NULL,
  has_kg BOOLEAN DEFAULT FALSE,
  has_evening_class BOOLEAN DEFAULT FALSE,
  additional_languages JSONB, -- ["Arabic", "Oromo"]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Class Structure (Task2 Data)**:
```sql
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(100) NOT NULL,
  class_type VARCHAR(20) NOT NULL, -- 'regular', 'kg', 'evening'
  shift_id INTEGER REFERENCES shifts(id),
  grade_level INTEGER,
  capacity INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  shift_name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_morning BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Student Schema**:
```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  class_id INTEGER REFERENCES classes(id),
  date_of_birth DATE,
  gender VARCHAR(10),
  phone_number VARCHAR(20),
  guardian_id INTEGER REFERENCES guardians(id),
  enrollment_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, graduated, transferred, withdrawn
  academic_year VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_academic_year ON students(academic_year);
```

**AI-Generated Exam Schema**:
```sql
CREATE TABLE ai_exams (
  id SERIAL PRIMARY KEY,
  exam_title VARCHAR(255) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id),
  class_id INTEGER REFERENCES classes(id),
  term INTEGER NOT NULL,
  component_type VARCHAR(50) NOT NULL, -- 'test1', 'test2', 'final'
  total_marks INTEGER NOT NULL,
  difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
  language VARCHAR(20) NOT NULL,
  exam_description TEXT,
  questions JSONB NOT NULL, -- Array of question objects
  time_limit_minutes INTEGER,
  has_bonus BOOLEAN DEFAULT FALSE,
  bonus_marks INTEGER,
  status VARCHAR(20) DEFAULT 'draft', -- draft, approved, published
  created_by INTEGER REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

CREATE TABLE student_exams (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES ai_exams(id),
  student_id INTEGER REFERENCES students(id),
  randomized_questions JSONB NOT NULL, -- Shuffled question order
  answers JSONB, -- Student's answers
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  time_elapsed_seconds INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, submitted, graded
  total_marks INTEGER,
  earned_marks DECIMAL(5,2),
  grading_results JSONB, -- Detailed grading per question
  requires_manual_grading BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_exams_student ON student_exams(student_id);
CREATE INDEX idx_student_exams_exam ON student_exams(exam_id);
```

**Year Rollover Archive Schema**:
```sql
CREATE TABLE archived_academic_years (
  id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL,
  archive_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_by INTEGER REFERENCES staff(id)
);

CREATE TABLE archived_students (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id),
  student_data JSONB NOT NULL, -- Complete student record
  class_name VARCHAR(100),
  final_status VARCHAR(20)
);

CREATE TABLE archived_attendance (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id),
  student_id VARCHAR(50),
  attendance_data JSONB NOT NULL -- All attendance records
);

CREATE TABLE archived_marks (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id),
  student_id VARCHAR(50),
  marks_data JSONB NOT NULL -- All mark records
);

CREATE TABLE archived_payments (
  id SERIAL PRIMARY KEY,
  archive_year_id INTEGER REFERENCES archived_academic_years(id),
  student_id VARCHAR(50),
  payment_data JSONB NOT NULL -- All payment records
);

CREATE INDEX idx_archived_students_year ON archived_students(archive_year_id);
CREATE INDEX idx_archived_attendance_year ON archived_attendance(archive_year_id);
```

### V1 to V2 Migration Strategy

**Migration Script Structure**:
```javascript
class V1toV2Migration {
  async migrate(v1Connection, v2Connection, branchCode) {
    console.log(`Starting migration for branch: ${branchCode}`);
    
    try {
      // 1. Migrate school configuration
      await this.migrateSchoolConfig(v1Connection, v2Connection);
      
      // 2. Migrate classes and shifts
      await this.migrateClasses(v1Connection, v2Connection);
      
      // 3. Migrate students
      await this.migrateStudents(v1Connection, v2Connection);
      
      // 4. Migrate staff
      await this.migrateStaff(v1Connection, v2Connection);
      
      // 5. Migrate subjects and assignments
      await this.migrateSubjects(v1Connection, v2Connection);
      
      // 6. Migrate attendance records
      await this.migrateAttendance(v1Connection, v2Connection);
      
      // 7. Migrate marks and assessments
      await this.migrateMarks(v1Connection, v2Connection);
      
      // 8. Migrate financial records
      await this.migrateFinancialRecords(v1Connection, v2Connection);
      
      // 9. Migrate guardians
      await this.migrateGuardians(v1Connection, v2Connection);
      
      // 10. Validate migration
      await this.validateMigration(v1Connection, v2Connection);
      
      console.log(`Migration completed successfully for ${branchCode}`);
      return { success: true, branchCode };
      
    } catch (error) {
      console.error(`Migration failed for ${branchCode}:`, error);
      await this.rollback(v2Connection);
      throw error;
    }
  }
  
  async migrateStudents(v1Conn, v2Conn) {
    const v1Students = await v1Conn.query('SELECT * FROM students');
    
    for (const student of v1Students.rows) {
      try {
        await v2Conn.query(`
          INSERT INTO students (
            student_id, first_name, middle_name, last_name,
            class_id, date_of_birth, gender, phone_number,
            guardian_id, enrollment_date, status, academic_year
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          student.student_id,
          student.first_name,
          student.middle_name,
          student.last_name,
          student.class_id,
          student.date_of_birth,
          student.gender,
          student.phone_number,
          student.guardian_id,
          student.enrollment_date,
          student.status || 'active',
          student.academic_year
        ]);
      } catch (error) {
        console.error(`Failed to migrate student ${student.student_id}:`, error.message);
        // Log but continue with other students
        await this.logMigrationError('students', student.student_id, error.message);
      }
    }
  }
  
  async validateMigration(v1Conn, v2Conn) {
    const validations = [
      { table: 'students', v1Query: 'SELECT COUNT(*) FROM students', v2Query: 'SELECT COUNT(*) FROM students' },
      { table: 'staff', v1Query: 'SELECT COUNT(*) FROM staff', v2Query: 'SELECT COUNT(*) FROM staff' },
      { table: 'classes', v1Query: 'SELECT COUNT(*) FROM classes', v2Query: 'SELECT COUNT(*) FROM classes' }
    ];
    
    for (const validation of validations) {
      const v1Count = await v1Conn.query(validation.v1Query);
      const v2Count = await v2Conn.query(validation.v2Query);
      
      if (v1Count.rows[0].count !== v2Count.rows[0].count) {
        throw new Error(`Validation failed for ${validation.table}: V1=${v1Count.rows[0].count}, V2=${v2Count.rows[0].count}`);
      }
    }
    
    console.log('All validation checks passed');
  }
}
```


## Notification System

### Multi-Channel Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Notification Service                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Notification Trigger Events                       │ │
│  │  - Monthly payment reminder                        │ │
│  │  - Student absence alert                           │ │
│  │  - Exam published                                  │ │
│  │  - Report card available                           │ │
│  │  - School announcement                             │ │
│  │  - Exam repeat request                             │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Notification Router                               │ │
│  │  - Determine recipient channels                    │ │
│  │  - Format message per channel                      │ │
│  │  - Queue for delivery                              │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│         ┌────────────────┼────────────────┐            │
│         ▼                ▼                ▼            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│  │   Push   │    │ Telegram │    │   SMS    │        │
│  │Notification│   │   Bot    │    │ Gateway  │        │
│  └──────────┘    └──────────┘    └──────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Push Notification Implementation

**Firebase Cloud Messaging Setup**:
```javascript
// Backend: Send push notification
import admin from 'firebase-admin';

class PushNotificationService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  }
  
  async sendToUser(userId, notification) {
    // Get user's FCM tokens (can have multiple devices)
    const tokens = await this.getUserTokens(userId);
    
    if (tokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return;
    }
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl
      },
      data: {
        type: notification.type,
        payload: JSON.stringify(notification.payload)
      },
      tokens: tokens
    };
    
    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(`Successfully sent ${response.successCount} notifications`);
      
      // Remove invalid tokens
      if (response.failureCount > 0) {
        await this.removeInvalidTokens(response.responses, tokens);
      }
      
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }
  
  async sendToMultipleUsers(userIds, notification) {
    const promises = userIds.map(userId => 
      this.sendToUser(userId, notification)
    );
    return Promise.allSettled(promises);
  }
  
  async getUserTokens(userId) {
    const result = await db.query(
      'SELECT fcm_token FROM user_devices WHERE user_id = $1 AND fcm_token IS NOT NULL',
      [userId]
    );
    return result.rows.map(row => row.fcm_token);
  }
  
  async removeInvalidTokens(responses, tokens) {
    const invalidTokens = [];
    responses.forEach((resp, idx) => {
      if (!resp.success && 
          (resp.error.code === 'messaging/invalid-registration-token' ||
           resp.error.code === 'messaging/registration-token-not-registered')) {
        invalidTokens.push(tokens[idx]);
      }
    });
    
    if (invalidTokens.length > 0) {
      await db.query(
        'DELETE FROM user_devices WHERE fcm_token = ANY($1)',
        [invalidTokens]
      );
    }
  }
}
```

**Frontend: FCM Token Registration** (Capacitor):
```javascript
import { PushNotifications } from '@capacitor/push-notifications';

class PushNotificationManager {
  async initialize() {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive !== 'granted') {
      throw new Error('Push notification permission denied');
    }
    
    // Register with FCM
    await PushNotifications.register();
    
    // Listen for registration
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      await this.saveTokenToServer(token.value);
    });
    
    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });
    
    // Listen for push notifications
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      this.handleNotification(notification);
    });
    
    // Listen for notification actions
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      this.handleNotificationAction(notification);
    });
  }
  
  async saveTokenToServer(token) {
    await apiClient.post('/api/v2/devices/register', {
      fcmToken: token,
      platform: Capacitor.getPlatform(),
      deviceId: await Device.getId()
    });
  }
  
  handleNotification(notification) {
    // Show local notification if app is in foreground
    const { title, body } = notification;
    PushNotifications.createChannel({
      id: 'default',
      name: 'Default',
      importance: 5,
      visibility: 1
    });
  }
  
  handleNotificationAction(notification) {
    const data = notification.notification.data;
    
    // Navigate based on notification type
    switch (data.type) {
      case 'exam_published':
        this.navigateToExams();
        break;
      case 'report_card':
        this.navigateToReportCard();
        break;
      case 'payment_reminder':
        this.navigateToPayments();
        break;
      default:
        this.navigateToNotifications();
    }
  }
}
```

### Telegram Bot Integration

**Bot Setup and Credential Retrieval**:
```javascript
import TelegramBot from 'node-telegram-bot-api';

class TelegramBotService {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.setupCommands();
  }
  
  setupCommands() {
    // /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, 
        'Welcome to Skoolific! 🎓\n\n' +
        'Use /credentials to retrieve your login credentials.\n' +
        'Use /help for more information.'
      );
    });
    
    // /credentials command
    this.bot.onText(/\/credentials/, async (msg) => {
      const chatId = msg.chat.id;
      const phoneNumber = msg.from.phone_number || msg.from.username;
      
      try {
        const credentials = await this.getCredentialsByPhone(phoneNumber);
        
        if (credentials) {
          this.bot.sendMessage(chatId,
            `Your Skoolific Credentials:\n\n` +
            `Branch Code: ${credentials.branchCode}\n` +
            `Username: ${credentials.username}\n` +
            `Password: ${credentials.password}\n\n` +
            `⚠️ Please change your password after first login.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          this.bot.sendMessage(chatId,
            'No account found with this phone number. ' +
            'Please contact your school administrator.'
          );
        }
      } catch (error) {
        this.bot.sendMessage(chatId,
          'Error retrieving credentials. Please try again later.'
        );
      }
    });
    
    // /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId,
        'Skoolific Bot Commands:\n\n' +
        '/credentials - Get your login credentials\n' +
        '/help - Show this help message\n\n' +
        'For support, contact your school administrator.'
      );
    });
  }
  
  async getCredentialsByPhone(phoneNumber) {
    const result = await db.query(`
      SELECT 
        u.username,
        u.password_plain,
        b.branch_code
      FROM users u
      JOIN branch_config b ON u.branch_id = b.id
      WHERE u.phone_number = $1
    `, [phoneNumber]);
    
    if (result.rows.length > 0) {
      return {
        username: result.rows[0].username,
        password: result.rows[0].password_plain,
        branchCode: result.rows[0].branch_code
      };
    }
    return null;
  }
  
  async sendNotification(phoneNumber, message) {
    try {
      // Get chat ID from phone number
      const chatId = await this.getChatIdByPhone(phoneNumber);
      
      if (chatId) {
        await this.bot.sendMessage(chatId, message);
        return { success: true };
      }
      
      return { success: false, reason: 'User not found on Telegram' };
    } catch (error) {
      console.error('Telegram notification error:', error);
      return { success: false, reason: error.message };
    }
  }
  
  async getChatIdByPhone(phoneNumber) {
    const result = await db.query(
      'SELECT telegram_chat_id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    return result.rows[0]?.telegram_chat_id;
  }
}
```

### SMS Gateway Integration

**SMS Service (Generic Implementation)**:
```javascript
class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER; // 'twilio', 'africastalking', etc.
    this.initializeProvider();
  }
  
  initializeProvider() {
    switch (this.provider) {
      case 'twilio':
        this.client = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        break;
      case 'africastalking':
        const AfricasTalking = require('africastalking')({
          apiKey: process.env.AT_API_KEY,
          username: process.env.AT_USERNAME
        });
        this.client = AfricasTalking.SMS;
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${this.provider}`);
    }
  }
  
  async sendSMS(phoneNumber, message) {
    try {
      switch (this.provider) {
        case 'twilio':
          return await this.sendViaTwilio(phoneNumber, message);
        case 'africastalking':
          return await this.sendViaAfricasTalking(phoneNumber, message);
        default:
          throw new Error('SMS provider not configured');
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
  }
  
  async sendViaTwilio(phoneNumber, message) {
    const result = await this.client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    return { success: true, messageId: result.sid };
  }
  
  async sendViaAfricasTalking(phoneNumber, message) {
    const result = await this.client.send({
      to: [phoneNumber],
      message: message,
      from: process.env.AT_SHORTCODE
    });
    return { success: true, messageId: result.SMSMessageData.Recipients[0].messageId };
  }
  
  async sendBulkSMS(phoneNumbers, message) {
    const promises = phoneNumbers.map(phone => 
      this.sendSMS(phone, message)
    );
    return Promise.allSettled(promises);
  }
}
```

**Unified Notification Service**:
```javascript
class NotificationService {
  constructor() {
    this.pushService = new PushNotificationService();
    this.telegramService = new TelegramBotService();
    this.smsService = new SMSService();
  }
  
  async sendNotification(userId, notification, channels = ['push']) {
    const user = await this.getUser(userId);
    const results = {};
    
    for (const channel of channels) {
      switch (channel) {
        case 'push':
          results.push = await this.pushService.sendToUser(userId, notification);
          break;
        case 'telegram':
          results.telegram = await this.telegramService.sendNotification(
            user.phoneNumber,
            notification.body
          );
          break;
        case 'sms':
          results.sms = await this.smsService.sendSMS(
            user.phoneNumber,
            notification.body
          );
          break;
      }
    }
    
    // Log notification
    await this.logNotification(userId, notification, results);
    
    return results;
  }
  
  async sendPaymentReminder(studentId) {
    const student = await this.getStudent(studentId);
    const guardian = await this.getGuardian(student.guardianId);
    
    const notification = {
      title: 'Payment Reminder',
      body: `Payment reminder for ${student.firstName} ${student.lastName}. Please check your payment status.`,
      type: 'payment_reminder',
      payload: { studentId }
    };
    
    // Send to both student and guardian
    await this.sendNotification(student.userId, notification, ['push', 'sms']);
    await this.sendNotification(guardian.userId, notification, ['push', 'telegram', 'sms']);
  }
  
  async sendAbsenceAlert(studentId, date) {
    const student = await this.getStudent(studentId);
    const guardian = await this.getGuardian(student.guardianId);
    
    const notification = {
      title: 'Absence Alert',
      body: `${student.firstName} ${student.lastName} was absent on ${date}.`,
      type: 'absence_alert',
      payload: { studentId, date }
    };
    
    // Send to guardian only
    await this.sendNotification(guardian.userId, notification, ['push', 'telegram', 'sms']);
  }
}
```


## Error Handling

### Error Classification and Messaging

**Error Types**:
```javascript
const ErrorTypes = {
  // Server errors (500-599)
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  
  // Client errors (400-499)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Business logic errors
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR'
};
```

**Custom Error Classes**:
```javascript
class AppError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

class ValidationError extends AppError {
  constructor(field, rule, value) {
    super(
      ErrorTypes.VALIDATION_ERROR,
      `Invalid input: ${field} - ${rule}`,
      { field, rule, value }
    );
  }
}

class DatabaseError extends AppError {
  constructor(operation, table, originalError) {
    super(
      ErrorTypes.DATABASE_ERROR,
      `Database error during ${operation} on ${table}`,
      { operation, table, originalError: originalError.message }
    );
  }
}

class BusinessLogicError extends AppError {
  constructor(message, context = {}) {
    super(
      ErrorTypes.BUSINESS_LOGIC_ERROR,
      message,
      context
    );
  }
}
```

**Error Handler Middleware**:
```javascript
function errorHandler(err, req, res, next) {
  // Log error with context
  logger.error({
    error: err,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    branchCode: req.branchCode,
    timestamp: new Date().toISOString()
  });
  
  // Determine error type and response
  if (err instanceof AppError) {
    return res.status(getStatusCode(err.type)).json({
      success: false,
      error: err.toJSON()
    });
  }
  
  // Handle specific error types
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      error: {
        type: ErrorTypes.DUPLICATE_ERROR,
        message: 'Duplicate entry: This record already exists',
        details: { constraint: err.constraint }
      }
    });
  }
  
  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      error: {
        type: ErrorTypes.VALIDATION_ERROR,
        message: 'Invalid reference: Referenced record does not exist',
        details: { constraint: err.constraint }
      }
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    error: {
      type: ErrorTypes.SERVER_ERROR,
      message: 'An unexpected server error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}
    }
  });
}

function getStatusCode(errorType) {
  const statusCodes = {
    [ErrorTypes.VALIDATION_ERROR]: 400,
    [ErrorTypes.AUTHENTICATION_ERROR]: 401,
    [ErrorTypes.AUTHORIZATION_ERROR]: 403,
    [ErrorTypes.NOT_FOUND_ERROR]: 404,
    [ErrorTypes.DUPLICATE_ERROR]: 409,
    [ErrorTypes.BUSINESS_LOGIC_ERROR]: 422,
    [ErrorTypes.SERVER_ERROR]: 500,
    [ErrorTypes.DATABASE_ERROR]: 500,
    [ErrorTypes.EXTERNAL_API_ERROR]: 502,
    [ErrorTypes.NETWORK_ERROR]: 503,
    [ErrorTypes.TIMEOUT_ERROR]: 504
  };
  return statusCodes[errorType] || 500;
}
```

**Frontend Error Display**:
```javascript
class ErrorDisplayService {
  showError(error) {
    const errorMessage = this.formatErrorMessage(error);
    
    // Show toast notification
    toast.error(errorMessage, {
      duration: 5000,
      position: 'top-right'
    });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', error);
    }
  }
  
  formatErrorMessage(error) {
    if (!error.response) {
      return 'Network error: Unable to connect to server. Please check your internet connection.';
    }
    
    const { type, message, details } = error.response.data.error;
    
    switch (type) {
      case 'VALIDATION_ERROR':
        return `Invalid input: ${details.field} - ${details.rule}`;
      
      case 'AUTHENTICATION_ERROR':
        return 'Authentication failed: Invalid credentials';
      
      case 'AUTHORIZATION_ERROR':
        return 'Access denied: You do not have permission to perform this action';
      
      case 'NOT_FOUND_ERROR':
        return 'Not found: The requested resource does not exist';
      
      case 'DUPLICATE_ERROR':
        return 'Duplicate entry: This record already exists';
      
      case 'DATABASE_ERROR':
        return `Database error: ${details.operation} failed on ${details.table}`;
      
      case 'EXTERNAL_API_ERROR':
        return 'External service error: Unable to complete request. Please try again.';
      
      case 'BUSINESS_LOGIC_ERROR':
        return message; // Use the specific business logic message
      
      case 'SERVER_ERROR':
      default:
        return 'Server error: An unexpected error occurred. Please try again later.';
    }
  }
}
```

## Testing Strategy

### Unit Testing

**Backend Unit Tests** (Jest):
```javascript
// Example: Ethiopian Calendar Service Tests
describe('EthiopianCalendarService', () => {
  test('should convert Gregorian to Ethiopian correctly', () => {
    const gregorianDate = new Date(2024, 0, 1); // January 1, 2024
    const ethiopianDate = EthiopianCalendar.toEthiopian(gregorianDate);
    
    expect(ethiopianDate.year).toBe(2016);
    expect(ethiopianDate.month).toBe(4); // Tahsas
    expect(ethiopianDate.day).toBe(22);
  });
  
  test('should increment Ethiopian year correctly', () => {
    const currentYear = 2018;
    const nextYear = EthiopianCalendar.incrementYear(currentYear);
    
    expect(nextYear).toBe(2019);
  });
  
  test('should format Ethiopian date in English', () => {
    const ethDate = { year: 2018, month: 1, day: 15 };
    const formatted = EthiopianCalendar.format(ethDate, 'en');
    
    expect(formatted).toBe('Meskerem 15, 2018');
  });
});

// Example: Gemini Service Tests (with mocks)
describe('GeminiService', () => {
  let geminiService;
  
  beforeEach(() => {
    geminiService = new GeminiService();
    geminiService.model.generateContent = jest.fn();
  });
  
  test('should generate exam with correct structure', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify({
          exam: {
            title: 'Math Test',
            questions: [
              { id: 1, type: 'multiple_choice', question: 'What is 2+2?', marks: 1, correctAnswer: '4' }
            ]
          }
        })
      }
    };
    
    geminiService.model.generateContent.mockResolvedValue(mockResponse);
    
    const examConfig = {
      grade: 8,
      subject: 'Mathematics',
      unit: 'Unit 1',
      language: 'English',
      questionTypes: [{ type: 'multiple_choice', count: 1, marksEach: 1 }],
      difficulty: 'medium',
      totalMarks: 1,
      componentType: 'test1'
    };
    
    const result = await geminiService.generateExam(examConfig);
    
    expect(result.exam.questions).toHaveLength(1);
    expect(result.exam.questions[0].type).toBe('multiple_choice');
  });
  
  test('should handle API rate limit error', async () => {
    geminiService.model.generateContent.mockRejectedValue(
      new Error('RATE_LIMIT exceeded')
    );
    
    await expect(geminiService.generateExam({}))
      .rejects
      .toThrow('API rate limit exceeded');
  });
});
```

**Frontend Unit Tests** (React Testing Library):
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendancePage from './AttendancePage';

describe('AttendancePage', () => {
  test('should display Ethiopian date', () => {
    render(<AttendancePage />);
    
    const dateElement = screen.getByText(/Meskerem|Tikimt|Hidar/);
    expect(dateElement).toBeInTheDocument();
  });
  
  test('should mark student as present', async () => {
    const mockMarkAttendance = jest.fn();
    render(<AttendancePage markAttendance={mockMarkAttendance} />);
    
    const presentButton = screen.getByRole('button', { name: /present/i });
    fireEvent.click(presentButton);
    
    await waitFor(() => {
      expect(mockMarkAttendance).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'present' })
      );
    });
  });
});
```

### Integration Testing

**API Integration Tests**:
```javascript
describe('Student API Integration', () => {
  let server;
  let testDb;
  
  beforeAll(async () => {
    testDb = await setupTestDatabase();
    server = await startTestServer(testDb);
  });
  
  afterAll(async () => {
    await teardownTestDatabase(testDb);
    await server.close();
  });
  
  test('should register new student', async () => {
    const studentData = {
      firstName: 'Test',
      lastName: 'Student',
      classId: 1,
      dateOfBirth: '2010-01-01',
      gender: 'Male'
    };
    
    const response = await request(server)
      .post('/api/v2/students/register')
      .send(studentData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.studentId).toBeDefined();
  });
  
  test('should prevent duplicate student registration', async () => {
    const studentData = {
      studentId: 'STU001',
      firstName: 'Test',
      lastName: 'Student'
    };
    
    // First registration
    await request(server)
      .post('/api/v2/students/register')
      .send(studentData)
      .expect(201);
    
    // Duplicate registration
    const response = await request(server)
      .post('/api/v2/students/register')
      .send(studentData)
      .expect(409);
    
    expect(response.body.error.type).toBe('DUPLICATE_ERROR');
  });
});
```

### End-to-End Testing

**E2E Test Example** (Playwright):
```javascript
import { test, expect } from '@playwright/test';

test.describe('Exam Creation Flow', () => {
  test('teacher can create and publish AI-generated exam', async ({ page }) => {
    // Login as teacher
    await page.goto('http://localhost:3000');
    await page.fill('[name="branchCode"]', 'ib3');
    await page.fill('[name="username"]', 'teacher1');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to exam creation
    await page.click('text=AI Test Generator');
    await page.click('text=Create New Exam');
    
    // Fill exam details
    await page.selectOption('[name="class"]', '8A');
    await page.selectOption('[name="subject"]', 'Mathematics');
    await page.selectOption('[name="term"]', '1');
    await page.selectOption('[name="component"]', 'test1');
    await page.fill('[name="description"]', 'Grade 8 Math Unit 1');
    await page.selectOption('[name="language"]', 'English');
    await page.selectOption('[name="difficulty"]', 'medium');
    
    // Configure question types
    await page.fill('[name="mcq_count"]', '5');
    await page.fill('[name="truefalse_count"]', '3');
    
    // Generate exam
    await page.click('button:has-text("Generate Exam")');
    
    // Wait for generation
    await expect(page.locator('text=Exam Preview')).toBeVisible({ timeout: 30000 });
    
    // Approve and publish
    await page.click('button:has-text("Approve")');
    await page.click('button:has-text("Publish to Students")');
    
    // Verify success
    await expect(page.locator('text=Exam published successfully')).toBeVisible();
  });
});
```

### Performance Testing

**Load Testing Strategy**:
- Use Apache JMeter or k6 for load testing
- Test scenarios:
  - 100 concurrent users accessing dashboard
  - 50 teachers creating mark lists simultaneously
  - 500 students taking exams concurrently
  - Bulk student registration (1000 students)
- Performance targets:
  - API response time < 500ms for 95th percentile
  - Page load time < 2 seconds
  - Database query time < 100ms for simple queries


## Security Architecture

### Authentication and Authorization

**Authentication Flow with Branch Code**:
```
1. User enters Branch Code
   ↓
2. System validates Branch Code and connects to correct database
   ↓
3. User enters Username and Password
   ↓
4. System validates credentials against branch database
   ↓
5. System generates JWT token with branch context
   ↓
6. Token stored securely (OS keychain for desktop, SecureStorage for mobile)
   ↓
7. Token included in all subsequent API requests
```

**JWT Token Structure**:
```javascript
const tokenPayload = {
  userId: user.id,
  username: user.username,
  role: user.role, // 'admin', 'teacher', 'student', 'guardian', 'super_admin'
  branchCode: branchCode,
  permissions: user.permissions,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
```

**Authentication Middleware**:
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        type: ErrorTypes.AUTHENTICATION_ERROR,
        message: 'Authentication required: No token provided'
      }
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token expiration
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        success: false,
        error: {
          type: ErrorTypes.AUTHENTICATION_ERROR,
          message: 'Authentication failed: Token expired'
        }
      });
    }
    
    // Attach user info and branch context to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions
    };
    req.branchCode = decoded.branchCode;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        type: ErrorTypes.AUTHENTICATION_ERROR,
        message: 'Authentication failed: Invalid token'
      }
    });
  }
}
```

**Role-Based Access Control (RBAC)**:
```javascript
const PERMISSIONS = {
  // Student Management
  'students.view': ['admin', 'teacher', 'administrative'],
  'students.create': ['admin', 'administrative'],
  'students.edit': ['admin', 'administrative'],
  'students.delete': ['admin'],
  
  // Staff Management
  'staff.view': ['admin', 'super_admin'],
  'staff.create': ['admin', 'super_admin'],
  'staff.edit': ['admin', 'super_admin'],
  'staff.delete': ['admin', 'super_admin'],
  
  // Academic
  'marks.view': ['admin', 'teacher', 'student', 'guardian'],
  'marks.create': ['admin', 'teacher'],
  'marks.edit': ['admin', 'teacher'],
  'marks.lock': ['admin', 'teacher'],
  
  // Exams
  'exams.create': ['admin', 'teacher'],
  'exams.publish': ['admin', 'teacher'],
  'exams.take': ['student'],
  'exams.grade': ['admin', 'teacher'],
  
  // Finance
  'payments.view': ['admin', 'administrative', 'guardian'],
  'payments.create': ['admin', 'administrative'],
  'payments.approve': ['admin'],
  
  // Reports
  'reports.view': ['admin', 'teacher', 'super_admin'],
  'reports.export': ['admin', 'super_admin'],
  
  // System
  'settings.view': ['admin', 'super_admin'],
  'settings.edit': ['admin', 'super_admin'],
  'year.rollover': ['admin', 'super_admin']
};

function authorize(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const allowedRoles = PERMISSIONS[permission];
    
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          type: ErrorTypes.AUTHORIZATION_ERROR,
          message: `Access denied: You do not have permission to ${permission}`
        }
      });
    }
    
    next();
  };
}

// Usage in routes
router.post('/students/register', 
  authenticateToken, 
  authorize('students.create'), 
  registerStudent
);
```

### Password Security

**Password Hashing**:
```javascript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// During user registration
async function registerUser(userData) {
  const hashedPassword = await hashPassword(userData.password);
  
  await db.query(`
    INSERT INTO users (username, password_hash, role, branch_id)
    VALUES ($1, $2, $3, $4)
  `, [userData.username, hashedPassword, userData.role, userData.branchId]);
}

// During login
async function login(username, password, branchCode) {
  const user = await db.query(`
    SELECT u.*, b.branch_code
    FROM users u
    JOIN branch_config b ON u.branch_id = b.id
    WHERE u.username = $1 AND b.branch_code = $2
  `, [username, branchCode]);
  
  if (user.rows.length === 0) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  const isValid = await verifyPassword(password, user.rows[0].password_hash);
  
  if (!isValid) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  return generateToken(user.rows[0]);
}
```

### SQL Injection Prevention

**Parameterized Queries**:
```javascript
// BAD - Vulnerable to SQL injection
async function getStudentBad(studentId) {
  const query = `SELECT * FROM students WHERE student_id = '${studentId}'`;
  return await db.query(query);
}

// GOOD - Using parameterized queries
async function getStudentGood(studentId) {
  const query = 'SELECT * FROM students WHERE student_id = $1';
  return await db.query(query, [studentId]);
}

// Query builder with automatic parameterization
class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.conditions = [];
    this.params = [];
  }
  
  where(field, operator, value) {
    this.params.push(value);
    this.conditions.push(`${field} ${operator} $${this.params.length}`);
    return this;
  }
  
  build() {
    let query = `SELECT * FROM ${this.table}`;
    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    return { query, params: this.params };
  }
}

// Usage
const { query, params } = new QueryBuilder('students')
  .where('class_id', '=', classId)
  .where('status', '=', 'active')
  .build();

const result = await db.query(query, params);
```

### XSS and CSRF Protection

**Input Sanitization**:
```javascript
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

function sanitizeInput(input, type = 'text') {
  switch (type) {
    case 'html':
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: []
      });
    
    case 'email':
      return validator.isEmail(input) ? validator.normalizeEmail(input) : null;
    
    case 'phone':
      return validator.isMobilePhone(input) ? input.replace(/[^0-9+]/g, '') : null;
    
    case 'text':
    default:
      return validator.escape(input);
  }
}

// Middleware for request sanitization
function sanitizeRequest(req, res, next) {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
}
```

**CSRF Protection**:
```javascript
import csrf from 'csurf';

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply to state-changing routes
router.post('/students/register', csrfProtection, registerStudent);
router.put('/students/:id', csrfProtection, updateStudent);
router.delete('/students/:id', csrfProtection, deleteStudent);

// Frontend: Include CSRF token in requests
axios.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();
```

### Rate Limiting

**Rate Limiter Implementation**:
```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_ERROR',
      message: 'Too many requests. Please try again later.'
    }
  }
});

// Strict rate limit for authentication
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_ERROR',
      message: 'Too many login attempts. Please try again in 15 minutes.'
    }
  }
});

// AI exam generation rate limit (expensive operation)
const aiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:ai:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exam generations per hour
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_ERROR',
      message: 'AI generation limit reached. Please try again in an hour.'
    }
  }
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/v2/auth/login', authLimiter);
app.use('/api/v2/ai-tests/generate', aiLimiter);
```

### HTTPS and Secure Communication

**SSL/TLS Configuration**:
```javascript
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  ca: fs.readFileSync(process.env.SSL_CA_PATH),
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384'
  ].join(':')
};

const server = https.createServer(httpsOptions, app);

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.secure || process.env.NODE_ENV === 'development') {
    next();
  } else {
    res.redirect(`https://${req.headers.host}${req.url}`);
  }
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
});
```


## Performance Optimization

### Caching Strategy

**Redis Caching Layer**:
```javascript
import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.defaultTTL = 3600; // 1 hour
  }
  
  async get(key) {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key, value, ttl = this.defaultTTL) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async del(key) {
    await this.redis.del(key);
  }
  
  async invalidatePattern(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  // Cache wrapper for database queries
  async cacheQuery(key, queryFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached) {
      return cached;
    }
    
    const result = await queryFn();
    await this.set(key, result, ttl);
    return result;
  }
}

const cache = new CacheService();

// Usage in API endpoints
async function getStudentList(req, res) {
  const { classId } = req.params;
  const cacheKey = `students:class:${classId}`;
  
  const students = await cache.cacheQuery(
    cacheKey,
    () => db.query('SELECT * FROM students WHERE class_id = $1', [classId]),
    1800 // 30 minutes
  );
  
  res.json({ success: true, data: students.rows });
}

// Invalidate cache on updates
async function updateStudent(req, res) {
  const { id } = req.params;
  const student = await db.query('UPDATE students SET ... WHERE id = $1', [id]);
  
  // Invalidate related caches
  await cache.invalidatePattern(`students:class:${student.class_id}`);
  await cache.del(`student:${id}`);
  
  res.json({ success: true, data: student });
}
```

**Client-Side Caching**:
```javascript
// React Query for data fetching and caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useStudents(classId) {
  return useQuery({
    queryKey: ['students', classId],
    queryFn: () => apiClient.get(`/api/v2/students/class/${classId}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  });
}

function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (student) => apiClient.put(`/api/v2/students/${student.id}`, student),
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['students', variables.classId]);
    }
  });
}
```

### Database Query Optimization

**Indexing Strategy**:
```sql
-- Student queries
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_academic_year ON students(academic_year);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_guardian_id ON students(guardian_id);

-- Attendance queries
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);

-- Marks queries
CREATE INDEX idx_marks_student_subject ON marks(student_id, subject_id);
CREATE INDEX idx_marks_class_term ON marks(class_id, term);

-- Exam queries
CREATE INDEX idx_student_exams_student ON student_exams(student_id);
CREATE INDEX idx_student_exams_exam ON student_exams(exam_id);
CREATE INDEX idx_student_exams_status ON student_exams(status);

-- Payment queries
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);

-- Composite indexes for common queries
CREATE INDEX idx_students_class_status ON students(class_id, status);
CREATE INDEX idx_attendance_student_date_status ON attendance(student_id, date, status);
```

**Query Optimization Examples**:
```javascript
// BAD - N+1 query problem
async function getStudentsWithGuardians(classId) {
  const students = await db.query('SELECT * FROM students WHERE class_id = $1', [classId]);
  
  for (const student of students.rows) {
    student.guardian = await db.query('SELECT * FROM guardians WHERE id = $1', [student.guardian_id]);
  }
  
  return students.rows;
}

// GOOD - Single query with JOIN
async function getStudentsWithGuardiansOptimized(classId) {
  const result = await db.query(`
    SELECT 
      s.*,
      g.id as guardian_id,
      g.first_name as guardian_first_name,
      g.last_name as guardian_last_name,
      g.phone_number as guardian_phone
    FROM students s
    LEFT JOIN guardians g ON s.guardian_id = g.id
    WHERE s.class_id = $1
  `, [classId]);
  
  return result.rows;
}

// Pagination for large datasets
async function getStudentsPaginated(classId, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  
  const [students, count] = await Promise.all([
    db.query(`
      SELECT * FROM students 
      WHERE class_id = $1 
      ORDER BY last_name, first_name
      LIMIT $2 OFFSET $3
    `, [classId, limit, offset]),
    
    db.query('SELECT COUNT(*) FROM students WHERE class_id = $1', [classId])
  ]);
  
  return {
    data: students.rows,
    pagination: {
      page,
      limit,
      total: parseInt(count.rows[0].count),
      totalPages: Math.ceil(count.rows[0].count / limit)
    }
  };
}
```

### Frontend Performance

**Code Splitting and Lazy Loading**:
```javascript
import { lazy, Suspense } from 'react';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const AITestGenerator = lazy(() => import('./pages/AITestGenerator'));
const FinanceModule = lazy(() => import('./pages/FinanceModule'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentManagement />} />
        <Route path="/ai-tests" element={<AITestGenerator />} />
        <Route path="/finance" element={<FinanceModule />} />
      </Routes>
    </Suspense>
  );
}
```

**Virtual Scrolling for Large Lists**:
```javascript
import { FixedSizeList } from 'react-window';

function StudentList({ students }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <StudentCard student={students[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={students.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Image Optimization**:
```javascript
// Lazy load images
function OptimizedImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

// Image compression on upload
import imageCompression from 'browser-image-compression';

async function handleImageUpload(file) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  
  const compressedFile = await imageCompression(file, options);
  return compressedFile;
}
```

**Bundle Optimization** (Vite config):
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'utils': ['axios', 'date-fns', 'lodash']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
};
```

## Deployment Strategy

### VPS Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VPS Server                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Nginx (Reverse Proxy & Load Balancer)            │ │
│  │  - SSL/TLS Termination                             │ │
│  │  - Static file serving                             │ │
│  │  - Request routing                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                              │
│         ┌────────────────┼────────────────┐            │
│         ▼                ▼                ▼            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│  │ Node.js  │    │ Node.js  │    │ Node.js  │        │
│  │Instance 1│    │Instance 2│    │Instance 3│        │
│  └──────────┘    └──────────┘    └──────────┘        │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PostgreSQL (Multiple Databases)                   │ │
│  │  - iqrab3_db                                       │ │
│  │  - almarkaz_db                                     │ │
│  │  - alkhwarizm_db                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Redis (Caching & Session Store)                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Automated Deployment Script

**Deployment Script** (`deploy.sh`):
```bash
#!/bin/bash

# Skoolific V2 Deployment Script

set -e

echo "Starting Skoolific V2 deployment..."

# Configuration
APP_DIR="/var/www/skoolific-v2"
BACKUP_DIR="/var/backups/skoolific"
NODE_ENV="production"

# 1. Backup current version
echo "Creating backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/skoolific_backup_$timestamp.tar.gz $APP_DIR

# 2. Pull latest code
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main

# 3. Install dependencies
echo "Installing backend dependencies..."
cd backend
npm ci --production

echo "Installing frontend dependencies..."
cd ../frontend
npm ci

# 4. Build frontend
echo "Building frontend..."
npm run build

# 5. Run database migrations
echo "Running database migrations..."
cd ../backend
npm run migrate

# 6. Restart services
echo "Restarting services..."
pm2 restart skoolific-api
sudo systemctl reload nginx

# 7. Health check
echo "Performing health check..."
sleep 5
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ $response -eq 200 ]; then
  echo "✓ Deployment successful!"
else
  echo "✗ Health check failed. Rolling back..."
  tar -xzf $BACKUP_DIR/skoolific_backup_$timestamp.tar.gz -C /
  pm2 restart skoolific-api
  exit 1
fi

echo "Deployment completed successfully!"
```

### Database Migration System

**Migration Framework**:
```javascript
// migrations/001_create_initial_schema.js
module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS school_config (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL,
        current_year INTEGER NOT NULL,
        number_of_terms INTEGER NOT NULL,
        school_days JSONB NOT NULL,
        shift_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(100) NOT NULL,
        class_type VARCHAR(20) NOT NULL,
        shift_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // ... more tables
  },
  
  down: async (db) => {
    await db.query('DROP TABLE IF EXISTS classes CASCADE');
    await db.query('DROP TABLE IF EXISTS school_config CASCADE');
  }
};

// Migration runner
class MigrationRunner {
  async runMigrations(branchCode) {
    const db = dbConnectionManager.getPool(branchCode);
    
    // Create migrations table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get executed migrations
    const executed = await db.query('SELECT name FROM migrations');
    const executedNames = executed.rows.map(r => r.name);
    
    // Get migration files
    const migrationFiles = fs.readdirSync('./migrations')
      .filter(f => f.endsWith('.js'))
      .sort();
    
    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedNames.includes(file)) {
        console.log(`Running migration: ${file}`);
        const migration = require(`./migrations/${file}`);
        
        try {
          await db.query('BEGIN');
          await migration.up(db);
          await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await db.query('COMMIT');
          console.log(`✓ Migration ${file} completed`);
        } catch (error) {
          await db.query('ROLLBACK');
          console.error(`✗ Migration ${file} failed:`, error);
          throw error;
        }
      }
    }
  }
}
```

### Monitoring and Logging

**Application Logging**:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'skoolific-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Usage
logger.info('User logged in', { userId: user.id, branchCode: branchCode });
logger.error('Database error', { error: error.message, query: query });
```

**Health Check Endpoint**:
```javascript
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };
  
  // Database check
  try {
    await db.query('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }
  
  // Redis check
  try {
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```


## Design Decisions and Rationales

### 1. Tauri vs Electron for Desktop

**Decision**: Use Tauri 2.0 for desktop applications

**Rationale**:
- 90-97% smaller bundle size compared to Electron (content rephrased for compliance with licensing restrictions)
- Better performance with native system webviews instead of bundled Chromium
- Lower memory footprint (30-40 MB idle vs 100+ MB for Electron)
- Built-in security features with Rust backend
- Faster startup times
- Better suited for resource-constrained environments common in Ethiopian schools

**Source**: [Tauri adoption guide](https://blog.logrocket.com/tauri-adoption-guide/)

### 2. Capacitor vs React Native for Mobile

**Decision**: Use Capacitor for mobile applications

**Rationale**:
- Maximum code reuse with existing React web codebase (80-90%)
- Web-first approach aligns with current development expertise
- Simpler learning curve for team already familiar with web technologies
- Built-in PWA capabilities for progressive enhancement
- Easier maintenance with single codebase across web and mobile
- Good performance for standard UI patterns (sufficient for school management app)

**Source**: [Capacitor vs React Native comparison](https://nextnative.dev/blog/capacitor-vs-react-native)

### 3. Database-per-Tenant vs Schema-per-Tenant

**Decision**: Use database-per-tenant (separate PostgreSQL database per branch)

**Rationale**:
- Complete data isolation between branches (critical for multi-school deployment)
- Independent scaling per branch
- Simplified backup and restore operations per branch
- Easier compliance with data residency requirements
- No risk of cross-branch data leakage
- Simpler connection management with branch code routing

**Trade-offs**: Higher resource usage, but acceptable given the small number of branches per school (typically 2-4)

**Source**: [PostgreSQL multi-tenancy patterns](https://kindatechnical.com/postgresql/multi-tenant-database-design-patterns.html)

### 4. Gemini API for Test Generation

**Decision**: Use Google Gemini API (gemini-1.5-pro or gemini-1.5-flash)

**Rationale**:
- Strong performance on educational content generation
- Support for structured JSON output (critical for exam format)
- Multilingual capabilities (English, Arabic, Amharic, Oromo, Somali, French)
- Cost-effective compared to GPT-4
- Good context window for including curriculum details
- PTCF (Persona/Task/Context/Format) framework support for prompt engineering

**Source**: [Gemini prompt engineering best practices](https://www.datastudios.org/post/google-gemini-prompt-engineering-strategies-for-more-accurate-responses)

### 5. IndexedDB + Dexie for Offline Storage

**Decision**: Use IndexedDB with Dexie.js wrapper for offline-first architecture

**Rationale**:
- Native browser support (no external dependencies)
- Large storage capacity (50MB+ per origin)
- Asynchronous API (non-blocking)
- Dexie.js provides promise-based API and query capabilities
- Well-suited for offline-first PWA architecture
- Background sync API integration for automatic synchronization

**Source**: [Offline-first PWA architecture](https://jb.desishub.com/blog/offline-first-with-dexie)

### 6. Ethiopian Calendar Library Selection

**Decision**: Use ethiopian-calendar-date-converter npm package

**Rationale**:
- Actively maintained library
- Bidirectional conversion (Gregorian ↔ Ethiopian)
- Handles 13-month Ethiopian calendar correctly
- Accounts for 7-8 year difference
- Simple API for integration

**Source**: [ethiopian-calendar-date-converter on npm](https://www.npmjs.com/package/ethiopian-calendar-date-converter)

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- Set up Tauri desktop application structure
- Set up Capacitor mobile application structure
- Implement centralized API configuration
- Create Ethiopian calendar utility module
- Set up multi-branch database architecture
- Implement authentication with branch code
- Create database schema auto-creation scripts

### Phase 2: Core Migration (Weeks 5-8)
- Develop V1 to V2 migration scripts
- Test migration with 4 existing schools
- Validate data integrity post-migration
- Implement year rollover system
- Create archived data retrieval functionality

### Phase 3: AI Test Generator (Weeks 9-12)
- Integrate Gemini API
- Develop prompt engineering templates
- Implement question type handlers
- Create exam preview and approval interface
- Develop exam publishing system
- Implement auto-grading engine
- Create manual grading interface for subjective questions

### Phase 4: Offline-First Architecture (Weeks 13-15)
- Implement IndexedDB storage layer
- Create sync manager
- Develop offline-aware API client
- Test offline functionality across all modules
- Implement conflict resolution strategies

### Phase 5: Notification System (Weeks 16-18)
- Set up Firebase Cloud Messaging
- Develop Telegram bot for credential retrieval
- Integrate SMS gateway
- Create unified notification service
- Implement notification triggers for all events

### Phase 6: Module Consolidation (Weeks 19-22)
- Consolidate Task pages with centralized data storage
- Merge finance module pages
- Reorganize HR module
- Improve academic module (mark lists, report cards)
- Implement KG and evening class support

### Phase 7: Native App Features (Weeks 23-25)
- Implement persistent login for all apps
- Develop role-based UI for Staff_App
- Create Super_Admin cross-branch reporting
- Implement native notifications
- Add username/password change functionality

### Phase 8: Security Hardening (Weeks 26-27)
- Implement comprehensive input validation
- Add rate limiting
- Conduct security audit
- Fix identified vulnerabilities
- Implement logging and monitoring

### Phase 9: Performance Optimization (Weeks 28-29)
- Implement Redis caching
- Optimize database queries
- Add frontend code splitting
- Implement virtual scrolling for large lists
- Optimize bundle sizes

### Phase 10: Testing and Deployment (Weeks 30-32)
- Comprehensive unit testing
- Integration testing
- End-to-end testing
- Performance testing
- User acceptance testing with pilot school
- Production deployment
- Post-deployment monitoring

## Risks and Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**: 
- Comprehensive backup before migration
- Validation scripts to verify data integrity
- Rollback plan if migration fails
- Pilot migration with one school first

### Risk 2: Gemini API Rate Limits or Costs
**Mitigation**:
- Implement rate limiting on exam generation (10 per hour per teacher)
- Cache generated exams for reuse
- Provide manual exam creation as fallback
- Monitor API usage and costs closely

### Risk 3: Offline Sync Conflicts
**Mitigation**:
- Implement last-write-wins strategy for simple conflicts
- Flag complex conflicts for manual resolution
- Provide clear UI feedback on sync status
- Test extensively with simulated network conditions

### Risk 4: Performance Issues with Large Datasets
**Mitigation**:
- Implement pagination for all large lists
- Use virtual scrolling for UI performance
- Add database indexes for common queries
- Implement Redis caching for frequently accessed data

### Risk 5: User Adoption of New Native Apps
**Mitigation**:
- Provide comprehensive training materials
- Create video tutorials in local languages
- Offer in-person training for pilot schools
- Maintain similar UI/UX to V1 where possible
- Provide gradual rollout option

## Success Metrics

### Technical Metrics
- API response time < 500ms (95th percentile)
- Page load time < 2 seconds
- Zero data loss during migration
- 99.5% uptime
- Offline sync success rate > 95%

### User Experience Metrics
- User satisfaction score > 4/5
- Task completion time reduced by 30%
- Login success rate > 98%
- Exam generation success rate > 90%
- Mobile app crash rate < 1%

### Business Metrics
- Successful deployment to all 4 existing schools
- Zero critical bugs in production
- Support ticket volume reduced by 40%
- User training completion rate > 90%
- System adoption rate > 95% within 3 months

## UI/UX Design System

For comprehensive UI/UX design specifications, including modern design system, dark mode support, multi-language implementation, and page-by-page designs, please refer to the following documents:

- **[UI_UX_DESIGN_SYSTEM.md](./UI_UX_DESIGN_SYSTEM.md)** - Design foundation, colors, typography, spacing, and internationalization
- **[UI_COMPONENTS_AND_PAGES.md](./UI_COMPONENTS_AND_PAGES.md)** - Component library and page designs
- **[UI_DESIGN_SUMMARY.md](./UI_DESIGN_SUMMARY.md)** - Implementation roadmap and best practices

### UI/UX Key Features

1. **Modern & Professional Design**: Clean, minimalist interface with contemporary design patterns
2. **Dark Mode Support**: Automatic detection, manual toggle, persistent preference
3. **Multi-Language Support**: English, Amharic, Arabic with RTL support - **language changes apply globally across ALL pages**
4. **Responsive Design**: Mobile-first approach optimized for all devices
5. **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
6. **Component Library**: Reusable, themeable components (buttons, inputs, cards, modals, tables, etc.)
7. **Consistent Design Language**: Unified visual system across all pages and platforms

### Design System Highlights

- **Color Palette**: Primary (Purple), Secondary (Teal), Accent (Orange) with semantic colors
- **Typography**: Inter font family with Amharic support (Noto Sans Ethiopic)
- **Spacing**: 8px base unit system for consistent rhythm
- **Animations**: Smooth transitions with appropriate timing
- **Theming**: CSS variables for easy theme switching
- **i18n**: React i18next for seamless language switching

## Conclusion

This technical design provides a comprehensive blueprint for transforming Skoolific from a web-based application to a multi-platform, AI-powered school management system with a modern, professional UI/UX. The design prioritizes:

1. **Zero data loss** through careful migration planning and validation
2. **Cultural appropriateness** with full Ethiopian calendar integration
3. **Offline-first architecture** to handle unreliable connectivity
4. **AI-powered innovation** with Gemini-based test generation
5. **Multi-branch support** with independent databases and aggregated reporting
6. **Native performance** through Tauri and Capacitor frameworks
7. **Comprehensive security** with authentication, authorization, and data protection
8. **Performance optimization** through caching, query optimization, and code splitting
9. **Modern UI/UX** with dark mode, multi-language support, and professional design
10. **Accessibility** ensuring inclusive design for all users

The phased implementation approach allows for iterative development, testing, and validation, reducing risk and ensuring successful deployment across all schools. The design is flexible enough to accommodate future enhancements while maintaining the core architecture principles.

