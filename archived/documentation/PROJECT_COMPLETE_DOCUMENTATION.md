# UpatePro - Comprehensive EHS Management System
## Complete Project Documentation

### **Project Overview**

UpatePro is a comprehensive Environment, Health, and Safety (EHS) management system designed for construction, manufacturing, and industrial projects. It provides end-to-end management of safety observations, incident reporting, permit-to-work processes, worker management, and compliance tracking.

### **Technology Stack**

#### **Frontend (React/TypeScript)**
- **Framework**: React 19.1.0 with TypeScript
- **UI Library**: Ant Design 5.25.1 with custom theming
- **State Management**: Zustand for authentication store
- **Routing**: React Router DOM 7.6.0
- **Styling**: Tailwind CSS 4.1.10 + styled-components 6.1.18
- **Charts**: Recharts 2.15.3 for data visualization
- **Build Tool**: Vite 6.3.5
- **HTTP Client**: Axios 1.9.0
- **Additional**: Framer Motion, Moment.js, React Hook Form

#### **Backend (Django/Python)**
- **Framework**: Django 5.2.1 with Django REST Framework 3.16.0
- **Database**: PostgreSQL
- **Authentication**: JWT with SimpleJWT 5.5.0
- **WebSockets**: Django Channels 4.2.2 for real-time notifications
- **File Storage**: Local media storage with organized upload paths
- **API**: RESTful APIs with comprehensive permissions
- **Additional**: CORS headers, Redis for channels, Face recognition, OpenCV

### **System Architecture**

#### **Frontend Structure**
```
frontedn/src/
├── app/                    # App configuration and routing
│   ├── App.tsx            # Main app component with routing
│   ├── ErrorBoundary.tsx  # Error handling
│   └── RoleBasedRoute.tsx # Route protection
├── common/                 # Shared utilities and components
│   ├── components/         # Reusable UI components
│   ├── contexts/          # React contexts (Theme, Notifications)
│   ├── hooks/             # Custom React hooks
│   ├── store/             # Zustand stores (authStore)
│   ├── utils/             # Utility functions (axios setup, security)
│   └── theme/             # Theme configuration
└── features/              # Feature-based modules
    ├── admin/             # Admin management
    ├── dashboard/         # Main dashboard
    ├── safetyobservation/ # Safety observations
    ├── worker/            # Worker management
    ├── ptw/               # Permit to Work
    ├── incidentmanagement/# Incident management
    ├── mom/               # Minutes of Meeting
    ├── chatbox/           # Real-time chat
    ├── signin/            # Authentication
    └── user/              # User profile management
```

#### **Backend Structure**
```
backend/
├── authentication/        # User management and authentication
├── safetyobservation/    # Safety observation APIs
├── worker/               # Worker management APIs
├── ptw/                  # Permit to Work APIs
├── incidentmanagement/   # Incident management APIs
├── mom/                  # Meeting management APIs
├── chatbox/              # Chat system APIs
├── tbt/                  # Toolbox Talk APIs
├── inductiontraining/    # Training APIs
├── jobtraining/          # Job training APIs
├── manpower/             # Manpower APIs
└── backend/              # Django project settings
```

### **Core System Features**

#### **1. Authentication & User Management**

**User Hierarchy:**
```python
class CustomUser(AbstractBaseUser, PermissionsMixin):
    USER_TYPE_CHOICES = [
        ('projectadmin', 'Project Admin'),
        ('adminuser', 'Admin User'),
    ]
    
    admin_type = models.CharField(max_length=20, choices=[
        ('master', 'Master Admin'),
        ('client', 'Client Admin'),
        ('epc', 'EPC Admin'),
        ('contractor', 'Contractor Admin'),
        ('clientuser', 'Client User'),
        ('epcuser', 'EPC User'),
        ('contractoruser', 'Contractor User'),
    ])
    grade = models.CharField(max_length=1, choices=[
        ('A', 'Grade A'),
        ('B', 'Grade B'),
        ('C', 'Grade C'),
    ])
```

**Features:**
- Multi-level user hierarchy with role-based permissions
- Project-based user management
- Grade system (A, B, C) for user classification
- JWT authentication with refresh token mechanism
- Digital signature template generation
- Company details and user profile management

#### **2. Safety Observation System**

**Core Model:**
```python
class SafetyObservation(models.Model):
    observationID = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    time = models.TimeField()
    workLocation = models.CharField(max_length=150)
    department = models.CharField(max_length=100)
    safetyObservationFound = models.TextField(max_length=500)
    typeOfObservation = models.CharField(max_length=50)  # Unsafe Act/Condition
    classification = models.CharField(max_length=100)
    riskRated = models.CharField(max_length=50)  # High/Medium/Low
    correctivePreventiveAction = models.TextField()
    reportedBy = models.CharField(max_length=100)
    correctiveActionAssignedTo = models.CharField(max_length=100)
    observationStatus = models.CharField(max_length=50)  # Open/Closed
    committedDate = models.DateField(null=True, blank=True)
    remarks = models.TextField(max_length=1000, blank=True)
```

**Features:**
- Auto-generated observation IDs (OBS-XXXXXXXXX format)
- Before/after photo uploads with file validation
- Workflow management: Reporter → Assigned Person → Approval
- Real-time notifications for status changes
- Commitment date tracking
- Comprehensive analytics and reporting
- Role-based edit permissions

#### **3. Worker Management**

**Worker Model:**
```python
class Worker(models.Model):
    worker_id = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=200, choices=DESIGNATION_CHOICES)
    department = models.CharField(max_length=200, choices=DEPARTMENT_CHOICES)
    employment_status = models.CharField(max_length=20, choices=[
        ('initiated', 'Initiated'),
        ('deployed', 'Deployed'),
        ('terminated', 'Terminated'),
        ('site_transferred', 'Site Transferred'),
    ])
    aadhaar = models.CharField(max_length=12, unique=True)
    pan = models.CharField(max_length=10, unique=True)
```

**Features:**
- Auto-generated worker IDs (WRK-0001 format)
- Comprehensive worker profiles with documents
- Employment status tracking
- Department and designation management
- Document validation (Aadhaar, PAN, UAN)
- Photo management with face recognition capabilities

#### **4. Permit to Work (PTW) System**

**Permit Model:**
```python
class Permit(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_verification', 'Pending Verification'),
        ('verified', 'Verified'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('closed', 'Closed'),
    ]
    permit_number = models.CharField(max_length=20, unique=True)
    permit_type = models.ForeignKey(PermitType, on_delete=models.CASCADE)
    planned_start_time = models.DateTimeField()
    planned_end_time = models.DateTimeField()
    hazards = models.TextField(blank=True)
    control_measures = models.TextField(blank=True)
    ppe_requirements = models.TextField(blank=True)
```

**Features:**
- Multi-level approval workflow
- Time-based permit validity
- Hazard identification and control measures
- PPE requirements specification
- Digital signatures integration
- Permit extensions and modifications

#### **5. Incident Management System**

**Incident Model:**
```python
class Incident(models.Model):
    incident_id = models.CharField(max_length=20, unique=True)  # INC-YYYY-NNNN
    incident_type = models.CharField(max_length=20, choices=[
        ('injury', 'Injury'),
        ('near_miss', 'Near Miss'),
        ('spill', 'Spill'),
        ('fire', 'Fire'),
        ('property_damage', 'Property Damage'),
    ])
    severity_level = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ])
    status = models.CharField(max_length=20, choices=[
        ('reported', 'Reported'),
        ('under_investigation', 'Under Investigation'),
        ('capa_pending', 'CAPA Pending'),
        ('closed', 'Closed'),
    ])
```

**Features:**
- Auto-generated incident IDs (INC-YYYY-NNNN format)
- Investigation management with root cause analysis
- CAPA (Corrective and Preventive Actions) tracking
- Evidence management and witness statements
- Comprehensive audit trails
- Investigation team management
- Progress tracking and reporting

#### **6. Minutes of Meeting (MOM) System**

**MOM Model:**
```python
class Mom(models.Model):
    class MeetingStatus(models.TextChoices):
        SCHEDULED = 'scheduled', _('Scheduled')
        LIVE = 'live', _('Live')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')

    title = models.CharField(max_length=255)
    agenda = models.TextField()
    meeting_datetime = models.DateTimeField()
    scheduled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL)
    status = models.CharField(max_length=20, choices=MeetingStatus.choices)
```

**Features:**
- Meeting scheduling and management
- Participant invitation system with email notifications
- Real-time participant response tracking (Accept/Reject/Pending)
- Live meeting support with attendance tracking
- Meeting completion with duration tracking
- Participant response links for external access

#### **7. Training Management**

**Induction Training:**
- New employee orientation programs
- Training completion tracking
- Certificate generation
- Compliance monitoring

**Job Training:**
- Role-specific training programs
- Skill development tracking
- Training effectiveness measurement

**Toolbox Talks (TBT):**
- Daily safety briefings
- Topic-based discussions
- Attendance tracking with photos
- Safety awareness programs

#### **8. Manpower Management**

**Features:**
- Daily attendance tracking with photo verification
- Workforce visualization and analytics
- Project-based manpower allocation
- Attendance reports and statistics
- Real-time workforce monitoring

#### **9. Chat System**

**Features:**
- Real-time messaging between users
- File sharing capabilities (documents, images)
- Role-based chat access
- Message history and search
- Group chat functionality

### **Advanced Features**

#### **1. Real-time Notification System**

**Notification Types:**
```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'meeting_invitation' | 'approval_request';
  link?: string;
  data?: any;
  created_at: string;
  is_read: boolean;
}
```

**Features:**
- WebSocket-based real-time notifications
- Meeting invitations with response tracking
- Approval request notifications
- Safety observation workflow notifications
- Incident assignment notifications
- CAPA due date reminders
- Notification persistence and read status

#### **2. Digital Signature System**

**Features:**
- Template-based signature generation
- Automatic signature creation for users and admins
- Document signing capabilities
- Signature verification
- Template customization with user details

#### **3. Theme System**

**Theme Configuration:**
```typescript
type ThemeMode = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  effectiveTheme: 'light' | 'dark';
}
```

**Features:**
- Light/Dark/System theme modes
- Ant Design theme integration
- Persistent theme preferences
- Responsive design adaptation

#### **4. Security Features**

**Authentication Security:**
- JWT-based authentication with refresh tokens
- Token blacklisting on logout
- Automatic token refresh
- Session timeout handling
- CSRF protection

**Authorization:**
- Role-based access control (RBAC)
- Object-level permissions
- Route protection
- API endpoint security
- Field-level access control

**Data Security:**
- Input validation and sanitization
- File upload restrictions
- SQL injection prevention
- XSS protection
- Secure headers implementation

### **Database Schema Overview**

#### **Core Tables:**
1. **authentication_customuser** - User management with roles and permissions
2. **authentication_project** - Project information and settings
3. **authentication_userdetail** - Extended user profile information
4. **authentication_admindetail** - Admin-specific profile data
5. **authentication_companydetail** - Company information
6. **safetyobservation_safetyobservation** - Safety observation records
7. **safetyobservation_safetyobservationfile** - File attachments for observations
8. **worker_worker** - Worker profile and employment data
9. **ptw_permit** - Permit to work records
10. **incidentmanagement_incident** - Incident reports
11. **incidentmanagement_investigation** - Investigation details
12. **incidentmanagement_capa** - Corrective and preventive actions
13. **mom_mom** - Meeting records
14. **mom_participantresponse** - Meeting participant responses

### **API Endpoints Overview**

#### **Authentication APIs:**
- `POST /authentication/login/` - User login
- `POST /authentication/logout/` - User logout
- `POST /authentication/refresh/` - Token refresh
- `GET /authentication/verify-token/` - Token verification
- `GET /authentication/users/` - User list
- `POST /authentication/users/` - Create user
- `GET /authentication/epcuser-list/` - EPC users list
- `GET /authentication/epc-clientuser-list/` - EPC and client users

#### **Safety Observation APIs:**
- `GET /api/v1/safetyobservation/` - List observations
- `POST /api/v1/safetyobservation/` - Create observation
- `GET /api/v1/safetyobservation/{id}/` - Get observation details
- `PUT /api/v1/safetyobservation/{id}/` - Update observation
- `DELETE /api/v1/safetyobservation/{id}/` - Delete observation
- `POST /api/v1/safetyobservation/{observationID}/update_commitment/` - Update commitment

#### **Worker Management APIs:**
- `GET /worker/` - List workers
- `POST /worker/` - Create worker
- `GET /worker/{id}/` - Get worker details
- `PUT /worker/{id}/` - Update worker
- `DELETE /worker/{id}/` - Delete worker

#### **PTW APIs:**
- `GET /api/v1/ptw/permits/` - List permits
- `POST /api/v1/ptw/permits/` - Create permit
- `GET /api/v1/ptw/permits/{id}/` - Get permit details
- `PUT /api/v1/ptw/permits/{id}/` - Update permit
- `POST /api/v1/ptw/permits/{id}/approve/` - Approve permit

#### **Incident Management APIs:**
- `GET /api/v1/incidentmanagement/incidents/` - List incidents
- `POST /api/v1/incidentmanagement/incidents/` - Create incident
- `GET /api/v1/incidentmanagement/incidents/{id}/` - Get incident details
- `PUT /api/v1/incidentmanagement/incidents/{id}/` - Update incident
- `POST /api/v1/incidentmanagement/investigations/` - Create investigation
- `POST /api/v1/incidentmanagement/capas/` - Create CAPA

### **Frontend Components Architecture**

#### **Common Components:**
- `PageLayout.tsx` - Standard page layout wrapper
- `SecurityTest.tsx` - Security testing component
- `TodoList/` - Task management components

#### **Feature Components:**

**Dashboard:**
- `Dashboard.tsx` - Main dashboard with navigation
- `DashboardOverview.tsx` - Dashboard home page with metrics

**Safety Observation:**
- `SafetyObservation.tsx` - Main safety observation dashboard
- `SafetyObservationForm.tsx` - Comprehensive form (1,329 lines)
- `SafetyObservationList.tsx` - Data table with filtering
- `SafetyObservationView.tsx` - Read-only detailed view
- `ObservationLog.tsx` - Analytics and charts

**Worker Management:**
- `WorkerPage.tsx` - Main worker management interface
- Worker CRUD operations with validation

**PTW System:**
- Permit creation and approval workflows
- Multi-step form with validation

**Incident Management:**
- Incident reporting forms
- Investigation management
- CAPA tracking interfaces

### **State Management**

#### **Auth Store (Zustand):**
```typescript
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  projectId: number | null;
  usertype: string | null;
  django_user_type: string | null;
  userId: string | number | null;
  isPasswordResetRequired: boolean;
  grade: string | null;
  // Methods for token management, logout, etc.
}
```

#### **Notification Context:**
- Real-time notification management
- WebSocket connection handling
- Notification state persistence

#### **Theme Context:**
- Theme mode management
- System theme detection
- Persistent theme preferences

### **File Upload and Management**

#### **Upload Directories:**
- `media/safety_observation_files/` - Safety observation attachments
- `media/worker_photos/` - Worker profile photos
- `media/admin_photos/` - Admin profile photos
- `media/company_logos/` - Company logo files
- `media/signatures/` - Digital signatures
- `media/signature_templates/` - Signature templates
- `media/chat_files/` - Chat file attachments
- `media/incident_attachments/` - Incident evidence files
- `media/investigation_evidence/` - Investigation evidence
- `media/capa_updates/` - CAPA progress documents

#### **File Validation:**
- Supported formats: JPG, PNG, PDF, DOCX
- Maximum file size: 5MB
- File type validation on upload
- Virus scanning capabilities

### **Workflow Management**

#### **Safety Observation Workflow:**
1. **Creation** - Reporter creates observation with details
2. **Assignment** - System assigns to corrective action owner
3. **Commitment** - Assigned person sets commitment date
4. **Action** - Corrective action implementation with after photos
5. **Review** - Reporter reviews completed work
6. **Closure** - Observation marked as closed

#### **PTW Workflow:**
1. **Draft** - Initial permit creation
2. **Verification** - Safety officer verification
3. **Approval** - Management approval
4. **Execution** - Work commencement
5. **Completion** - Work completion confirmation
6. **Closure** - Permit closure and archival

#### **Incident Management Workflow:**
1. **Reporting** - Initial incident report
2. **Investigation** - Root cause analysis
3. **CAPA Creation** - Corrective/preventive actions
4. **Implementation** - Action execution
5. **Verification** - Effectiveness verification
6. **Closure** - Incident closure

### **Reporting and Analytics**

#### **Safety Observation Analytics:**
- Status distribution (Open/Closed)
- Department-wise observations
- Risk level analysis
- Trend analysis over time
- Contractor performance metrics
- Response time analytics

#### **Incident Analytics:**
- Incident frequency analysis
- Severity level distribution
- Department-wise incident rates
- Investigation completion rates
- CAPA effectiveness tracking
- Cost impact analysis

#### **Worker Analytics:**
- Employment status distribution
- Department-wise workforce
- Training completion rates
- Attendance patterns
- Performance metrics

### **Integration Capabilities**

#### **External System Integration:**
- RESTful API endpoints for third-party systems
- Webhook support for real-time updates
- Data export capabilities (Excel, PDF)
- Import functionality for bulk data

#### **Mobile Compatibility:**
- Responsive web design
- Mobile-optimized interfaces
- Touch-friendly controls
- Offline capability planning

### **Deployment and Configuration**

#### **Environment Configuration:**
```python
# Django Settings
DEBUG = True  # Set to False in production
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'final',
        'USER': 'postgres',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

#### **Frontend Configuration:**
```typescript
// Vite Configuration
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

### **Performance Optimizations**

#### **Frontend Optimizations:**
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Bundle size optimization
- Caching strategies
- Virtual scrolling for large lists

#### **Backend Optimizations:**
- Database query optimization
- API response caching
- File compression
- Connection pooling
- Background task processing

### **Security Considerations**

#### **Data Protection:**
- Personal data encryption
- Secure file storage
- Access logging
- Data retention policies
- GDPR compliance features

#### **Network Security:**
- HTTPS enforcement
- CORS configuration
- Rate limiting
- Input sanitization
- SQL injection prevention

### **Maintenance and Monitoring**

#### **Logging:**
- Application logs
- Error tracking
- Performance monitoring
- User activity logs
- Security event logs

#### **Backup and Recovery:**
- Database backup strategies
- File backup procedures
- Disaster recovery planning
- Data migration tools

### **Future Enhancements**

#### **Planned Features:**
- Mobile application development
- Advanced analytics with AI/ML
- Integration with IoT devices
- Blockchain for audit trails
- Advanced reporting with BI tools
- Multi-language support
- Advanced workflow automation

### **Development Guidelines**

#### **Code Standards:**
- TypeScript strict mode
- ESLint configuration
- Prettier code formatting
- Component documentation
- API documentation
- Unit testing requirements

#### **Git Workflow:**
- Feature branch development
- Code review requirements
- Automated testing
- Deployment pipelines
- Version tagging

---

## **Conclusion**

UpatePro represents a comprehensive, enterprise-grade EHS management system that addresses the complex needs of modern industrial projects. With its robust architecture, extensive feature set, and focus on user experience, it provides organizations with the tools needed to maintain high safety standards, ensure compliance, and drive continuous improvement in their operations.

The system's modular design allows for easy customization and extension, making it suitable for various industries including construction, manufacturing, oil & gas, and other industrial sectors. Its emphasis on real-time communication, workflow automation, and data-driven insights positions it as a valuable asset for organizations committed to operational excellence and safety leadership.
