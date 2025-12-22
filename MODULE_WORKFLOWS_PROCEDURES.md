# Athens EHS System - Module Workflows & Procedures

## 1. AUTHENTICATION MODULE

### User Types & Hierarchy
```
Master Admin → Project Admins (Client/EPC/Contractor) → Admin Users (clientuser/epcuser/contractoruser)
```

### Workflow
1. **Master Admin Setup**
   - Creates projects
   - Creates project admins for each project
   - Approves admin details

2. **Project Admin Setup**
   - Completes admin profile (AdminDetail)
   - Creates admin users under their project
   - Manages user approvals

3. **Admin User Setup**
   - Completes user profile (UserDetail)
   - Awaits approval from project admin
   - Gains access to modules after approval

### Key Endpoints
- `/authentication/signin/` - Login
- `/authentication/admin/detail/` - Admin profile management
- `/authentication/userdetail/` - User profile management
- `/authentication/admin/list/{projectId}/` - Get project admins

---

## 2. ATTENDANCE MODULE

### Workflow
1. **Daily Check-in**
   - User takes selfie photo
   - System validates face recognition
   - Records attendance with timestamp and location

2. **Attendance Tracking**
   - View daily/monthly attendance records
   - Export attendance reports
   - Admin oversight of team attendance

### Key Features
- Face recognition validation
- GPS location tracking
- Photo capture for verification
- Attendance reports and analytics

### Endpoints
- `/authentication/attendance/checkin/` - Record attendance
- `/authentication/attendance/history/` - View attendance history

---

## 3. PERMIT TO WORK (PTW) MODULE

### Workflow
1. **Permit Creation**
   - Select permit type (Hot Work, Confined Space, etc.)
   - Fill permit details and hazards
   - Add team members and safety measures

2. **Approval Process**
   - Issuing Authority reviews and approves
   - Performing Authority accepts permit
   - Work can commence after dual approval

3. **Work Execution**
   - Monitor permit status
   - Update work progress
   - Close permit upon completion

### Key Features
- Multiple permit types
- Multi-level approval workflow
- QR code generation for permits
- Real-time status tracking
- Notification system

### Endpoints
- `/ptw/permits/` - CRUD operations
- `/ptw/permit-types/` - Available permit types
- `/ptw/workflow/` - Approval workflow management

---

## 4. SAFETY OBSERVATION MODULE

### Workflow
1. **Observation Creation**
   - Report unsafe conditions/behaviors
   - Capture photos and location
   - Assign severity level

2. **Assignment & Action**
   - Assign to responsible person
   - Set commitment date for resolution
   - Track progress and updates

3. **Closure**
   - Upload fixed photos
   - Request approval from observer
   - Close observation after verification

### Key Features
- Photo evidence capture
- Assignment workflow
- Progress tracking
- Approval system

### Endpoints
- `/safetyobservation/observations/` - CRUD operations
- `/safetyobservation/assign/` - Assignment management

---

## 5. INCIDENT MANAGEMENT MODULE

### Workflow
1. **Incident Reporting**
   - Report incidents immediately
   - Capture incident details and photos
   - Classify incident type and severity

2. **Investigation**
   - Assign investigation team
   - Conduct root cause analysis
   - Document findings and evidence

3. **Action Planning**
   - Create corrective actions
   - Assign responsibilities
   - Set target completion dates

4. **Follow-up**
   - Track action completion
   - Verify effectiveness
   - Close incident after resolution

### Key Features
- Immediate incident reporting
- Investigation workflow
- Action tracking
- Analytics and reporting

### Endpoints
- `/incidentmanagement/incidents/` - CRUD operations
- `/incidentmanagement/investigations/` - Investigation management

---

## 6. TRAINING MODULES

### A. Induction Training
**Workflow:**
1. Create training sessions
2. Assign employees to sessions
3. Conduct training with attendance
4. Generate completion certificates

### B. Job Training
**Workflow:**
1. Define job-specific training requirements
2. Schedule training sessions
3. Track completion and competency
4. Maintain training records

### C. Toolbox Talk (TBT)
**Workflow:**
1. Schedule daily/weekly safety talks
2. Record attendance
3. Document topics covered
4. Track participation rates

### Endpoints
- `/inductiontraining/sessions/` - Induction training management
- `/jobtraining/sessions/` - Job training management
- `/tbt/sessions/` - Toolbox talk management

---

## 7. INSPECTION MODULE

### Workflow
1. **Inspection Planning**
   - Create inspection checklists
   - Schedule inspections
   - Assign inspectors

2. **Inspection Execution**
   - Complete inspection forms
   - Capture photos and evidence
   - Record findings and observations

3. **Follow-up Actions**
   - Generate corrective actions
   - Track completion
   - Re-inspect if required

### Key Features
- Customizable inspection forms
- Photo documentation
- Action tracking
- Compliance reporting

### Endpoints
- `/inspection/inspections/` - CRUD operations
- `/inspection/forms/` - Dynamic form management

---

## 8. ESG (ENVIRONMENTAL, SOCIAL, GOVERNANCE) MODULE

### Workflow
1. **Environmental Management**
   - Track environmental aspects
   - Monitor generation data
   - Manage waste disposal
   - Record biodiversity events

2. **Social Responsibility**
   - Community engagement tracking
   - Employee welfare monitoring
   - Stakeholder management

3. **Governance**
   - Policy management
   - Compliance tracking
   - Audit management

### Key Features
- Environmental monitoring
- Sustainability targets
- Carbon footprint tracking
- ESG reporting

### Endpoints
- `/environment/aspects/` - Environmental aspects
- `/environment/monitoring/` - Environmental monitoring

---

## 9. QUALITY MANAGEMENT MODULE

### Workflow
1. **Quality Planning**
   - Define quality standards
   - Create inspection templates
   - Set quality targets

2. **Quality Control**
   - Conduct quality inspections
   - Record non-conformances
   - Implement corrective actions

3. **Quality Assurance**
   - Monitor quality metrics
   - Generate quality reports
   - Continuous improvement

### Key Features
- Quality inspections
- Defect management
- Supplier quality tracking
- Quality analytics

### Endpoints
- `/quality/inspections/` - Quality inspections
- `/quality/defects/` - Defect management

---

## 10. MINUTES OF MEETING (MOM) MODULE

### Workflow
1. **Meeting Setup**
   - Create meeting agenda
   - Invite participants
   - Schedule meeting

2. **Meeting Execution**
   - Record meeting minutes
   - Capture action items
   - Assign responsibilities

3. **Follow-up**
   - Track action item completion
   - Send meeting summaries
   - Schedule follow-up meetings

### Key Features
- Meeting management
- Action item tracking
- Participant management
- Meeting summaries

### Endpoints
- `/mom/meetings/` - Meeting management
- `/mom/action-items/` - Action item tracking

---

## 11. CHATBOX MODULE

### Workflow
1. **Real-time Communication**
   - Send/receive messages
   - File sharing
   - Group conversations

2. **Notification System**
   - Message notifications
   - Read receipts
   - Typing indicators

### Key Features
- Real-time messaging
- File attachments
- Message history
- Notification system

### Endpoints
- `/chatbox/messages/` - Message management
- `/chatbox/conversations/` - Conversation management

---

## 12. VOICE TRANSLATOR MODULE

### Workflow
1. **Voice Input**
   - Record voice message
   - Convert speech to text
   - Detect source language

2. **Translation**
   - Translate to target language
   - Convert text to speech
   - Play translated audio

### Key Features
- Multi-language support
- Real-time translation
- Voice synthesis
- Text-to-speech

### Endpoints
- `/voice-translator/translate/` - Translation service
- `/voice-translator/languages/` - Supported languages

---

## 13. AI BOT MODULE

### Workflow
1. **Query Processing**
   - Receive user queries
   - Process natural language
   - Search knowledge base

2. **Response Generation**
   - Generate contextual responses
   - Provide relevant information
   - Suggest actions

### Key Features
- Natural language processing
- Knowledge base search
- Contextual responses
- Multi-language support

### Endpoints
- `/ai-bot/query/` - Query processing
- `/ai-bot/knowledge/` - Knowledge base management

---

## COMMON PROCEDURES

### 1. User Access Control
- Role-based permissions
- Project-based access
- Module-specific permissions
- Approval workflows

### 2. Notification System
- WebSocket real-time notifications
- Email notifications
- In-app notifications
- Notification preferences

### 3. File Management
- Secure file upload
- File validation
- Storage optimization
- Access control

### 4. Reporting & Analytics
- Module-specific reports
- Cross-module analytics
- Export capabilities
- Dashboard views

### 5. Security Features
- JWT authentication
- CSRF protection
- Input validation
- Audit logging

---

## DEPLOYMENT PROCEDURES

### Development
```bash
cd /var/www/athens/backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000
cd /var/www/athens/frontend && npm run dev
```

### Production
```bash
./setup_https_config.sh
```

### System Health Check
```bash
./diagnose_system.sh
```

---

## TROUBLESHOOTING

### Common Issues
1. **Mixed Content Error**: Run `./setup_https_config.sh`
2. **502 Bad Gateway**: Restart backend server
3. **Frontend Not Loading**: Restart Vite server
4. **Database Issues**: Check database connections
5. **Permission Errors**: Verify user roles and permissions

### Emergency Recovery
```bash
pkill -f vite
pkill -f "python.*manage.py"
cd /var/www/athens/backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &
cd /var/www/athens/frontend && npm run dev &
systemctl restart nginx
```