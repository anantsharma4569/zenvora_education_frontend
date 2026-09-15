# Zenvora Education — Backend Data Guide (for Frontend Devs)

This file explains the backend data (the Frappe "Education" module) in plain language — no backend knowledge needed. If you're building frontend screens and need to know "what data exists and where it comes from", this is the doc.

---

## 1. One concept you need first: what is a "DocType"?

In the backend, every kind of record is called a **DocType**. Think of it like:

- A **table** in a database, or
- A **model/interface** in your frontend code (like a TypeScript `interface Student { ... }`)

Each DocType has **fields** (like columns/properties). For example, the `Student` DocType has fields like `first_name`, `date_of_birth`, `gender`, etc.

Two special kinds of DocTypes you'll see below:

- **Child table** — not a standalone record, it only exists *inside* another record, like a list of items inside an order. Example: `Student Guardian` is a child table that lives inside `Student` (it's just the list of guardians attached to one student).
- **Single / Tool** — not a list of records at all, just one settings screen or one "bulk action" screen (like "mark attendance for a whole class at once"). Example: `Student Attendance Tool`.

Everything below is grouped by what it's used for, in the order a student would actually move through the system.

---

## 2. The big picture: how a person becomes "a student in a class"

This directly answers "when a student applicant comes, how do we get them into a class":

```
1. Student Admission        → school opens applications for a year ("Admissions open for 2026-27")
2. Student Applicant        → a family fills the application form
3. (Admin approves)         → application status becomes "Approved"
4. Student                  → an official Student record is created for them
5. Program Enrollment       → the student is registered into a Program (e.g. "Grade 10") for the year/term
6. Student Group            → the student is placed into a "class" / section (e.g. "Grade 10 - Section A")
7. Course Schedule          → that class gets a timetable (which room, which time, which teacher)
8. Student Attendance       → daily attendance is marked against that class
9. Assessment Plan/Result   → exams are held and graded for that class
10. Fee Schedule / Fees     → fees are billed to students in that class/program
```

**`Student Group` is the actual "class"** in this system — that's the DocType you're looking for when you hear "put the student in a class". A `Program` (like "Grade 10") is the bigger container; a `Student Group` is the specific section/batch inside it that actually meets, gets a timetable, and takes attendance/exams together.

---

## 3. Admissions & Enrollment

*How a person goes from "applicant" to "officially enrolled in a program".*

| DocType | Fields | What it means, in plain words | Example user story |
|---|---|---|---|
| **Student Admission** | 11 | The "admissions announcement" for a year — open/close dates, which programs are accepting applicants, application fee. | As an Admin, I publish an admission cycle with open/close dates so families know when they can apply. |
| **Student Admission Program** | 7 | A row inside Student Admission — one program's application fee and age limits for that cycle. | As an Admin, I set a different fee and age range for each program in this year's admissions. |
| **Student Applicant** | 42 | The actual application form a family fills in — name, DOB, program chosen, guardians, address, and a status (Applied / Approved / Rejected). | As a parent, I submit my child's details and pick a program so the school can review and approve them. |
| **Student** | 47 | The official record of an enrolled student, created once an applicant is approved — name, contact, guardians, siblings, address, enrolled/left status. | As an Admin, I approve an applicant and the system creates their permanent Student profile. |
| **Program Enrollment** | 21 | "This student is registered in this Program for this Academic Year/Term" — also lists the courses they picked. | As an Admin, I enroll an approved student into "Grade 10, 2026-27" and pick their courses. |
| **Program Enrollment Course** | 2 | Child table inside Program Enrollment — the list of courses this student is taking. | As an Admin, I add "Physics" and "Math" to this student's enrollment. |
| **Program Enrollment Fee** | 5 | Child table inside Program Enrollment — the fee amounts and due dates tied to this student's enrollment. | As Accounts, I see this student owes ₹5,000 by 1 Oct as part of their enrollment. |
| **Program Enrollment Tool** | 17 | A bulk-action screen: enroll many approved applicants into a program in one go, instead of one at a time. | As an Admin, I select 40 approved applicants and enroll them all into "Grade 10" in one click. |
| **Program Enrollment Tool Student** | 6 | Just the temporary list of students used inside the bulk tool above. Not seen outside that screen. | (Internal — supports the tool above.) |
| **Course Enrollment** | 7 | Links one student to one specific course, used to track their activity/quiz results in that course. | As the system, I track that this student is enrolled in "Physics" so I can log their quiz attempts. |

---

## 4. People: Students, Guardians, Teachers

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Student** | 47 | (See above.) The master student profile. | — |
| **Guardian** | 19 | A parent/guardian's own profile — contact, occupation, and a login (User) so they can see their child's info. | As Admin, I store a parent's phone/email once, and link it to all their kids. |
| **Student Guardian** | 3 | Child table inside Student — which guardians belong to this student, and the relation (father/mother/etc). | As Admin, I mark this person as this student's "Mother". |
| **Guardian Student** | 3 | Child table inside Guardian — which students belong to this guardian (the reverse link). | As a parent (Guardian), I can see all my children listed under my profile. |
| **Student Sibling** | 8 | Records a student's brothers/sisters, and whether they also study at this school. | As Admin, I note that this student's sibling also studies here, for family discounts/reporting. |
| **Student Siblings** | 3 | An older/simpler sibling table (name, gender, DOB only) — rarely used, mostly superseded by Student Sibling above. | (Legacy — avoid building new features on this one.) |
| **Guardian Interest** | 1 | Child table — tags a guardian's interests/hobbies. Minor, rarely used. | As Admin, I tag that this parent is "interested in volunteering". |
| **Instructor** | 10 | A teacher's profile, usually linked to their HR employee record. | As Admin, I create a teacher profile so they can be assigned to classes. |
| **Instructor Log** | 9 | Child table — a history entry of what a teacher taught (which term/course/class). | As Admin, I can see a teacher's full teaching history. |
| **Student Category** | 1 | A simple label to group students, e.g. "General", "Sports Quota", "NRI" — often used to charge different fees. | As Admin, I tag a student as "Sports Quota" so their fee structure is different. |
| **Student Batch Name** | 1 | A simple label like "Batch A" or "2026 Batch", used to split a Program's students into sub-batches. | As Admin, I label a group of students "Batch A" within Grade 10. |
| **Student Language** | 1 | A simple list of languages — used when a student picks a language elective. | As a Student, I choose "French" as my second language from the list. |

---

## 5. Academic Structure: Years, Programs, Courses

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Academic Year** | 4 | A school year, e.g. "2026-2027", with start/end dates. | As Admin, I set up the "2026-2027" academic year before doing anything else. |
| **Academic Term** | 7 | A term/semester inside an Academic Year, e.g. "Term 1". | As Admin, I split 2026-27 into "Term 1" and "Term 2". |
| **Program** | 8 | A "level" or "class" like "Grade 10" or "B.Com" — the top-level academic offering, made of several Courses. | As Admin, I create the "Grade 10" program and attach subjects (courses) to it. |
| **Program Course** | 3 | Child table inside Program — which courses belong to this program, and whether they're required or optional. | As Admin, I mark "Math" as required and "Art" as optional inside Grade 10. |
| **Course** | 12 | One subject, e.g. "Mathematics" — can have a description, topics, and default grading rules. | As Admin, I create the "Mathematics" course for teachers to be scheduled against. |
| **Course Topic** | 2 | Child table — links a Course to its Topics (chapters/units). | As Admin, I add "Algebra" and "Geometry" as topics under Math. |
| **Topic** | 4 | One chapter/unit inside a course — can hold learning material. | As a Teacher, I create a "Algebra" topic with a short description. |
| **Topic Content** | 3 | Child table — actual learning material (video/article/quiz) attached to a Topic. | As a Teacher, I attach a video link to the "Algebra" topic. |
| **Room** | 3 | A physical classroom/lab with a seating capacity — used when scheduling classes. | As Admin, I list "Lab 1" with a capacity of 30 seats, so it can be booked for classes. |
| **School House** | 1 | The school's "House" system (e.g. Red House / Blue House) for inter-house competitions. | As Admin, I assign every student to a House for the sports day. |

---

## 6. Classes & Timetables

*This is the section that answers "how do we make the class".*

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Student Group** | 16 | **This is "the class"** — a group/section of students who take a course/batch together. Has a max size, a course, a batch, and a list of students + teachers. | As Admin, I create "Grade 10 - Section A - Math" and add 30 students to it — this becomes the class that gets a timetable, attendance, and exams. |
| **Student Group Student** | 5 | Child table — the actual list of students inside a Student Group, with roll numbers. | As Admin, I add Student #5 to "Grade 10 - Section A" with roll number 12. |
| **Student Group Instructor** | 3 | Child table — which teacher(s) are assigned to a Student Group. | As Admin, I assign "Mr. Sharma" as the teacher for this class. |
| **Student Group Creation Tool** | 8 | A bulk-action screen — auto-creates Student Groups for every course in a Program at once, instead of making each one by hand. | As Admin, I click one button to create a class for every subject in Grade 10 at once. |
| **Student Group Creation Tool Course** | 7 | Child table — one row per course inside that bulk-creation screen. | (Internal — supports the tool above.) |
| **Course Schedule** | 16 | One timetable slot: this class (Student Group) + this course + this room + this teacher + this time. | As Admin, I schedule "Grade 10 - Math" every Monday 10-11am in Room 3 with Mr. Sharma. |
| **Course Scheduling Tool** | 21 | A bulk-action screen — generates many Course Schedule slots at once (e.g. "every Mon & Wed, 10-11am, for 3 months"). | As Admin, I generate a whole term's timetable for a class in one action instead of adding each slot manually. |

---

## 7. Attendance

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Student Attendance** | 12 | One attendance record — this student, this date/class, Present/Absent/On Leave. | As a Teacher, I mark a student "Present" for today's Math class. |
| **Student Attendance Tool** | 10 | A bulk-action screen — mark attendance for an entire class in one screen instead of one student at a time. | As a Teacher, I open my class list and mark everyone's attendance for today in one go. |
| **Student Leave Application** | 14 | A leave request from a student for a date range — can automatically mark attendance as "on leave" for those days. | As a Student/Parent, I apply for 3 days of leave, and attendance is auto-marked as "Leave" for those days. |

---

## 8. Exams & Grading

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Assessment Criteria** | 2 | One grading criterion, e.g. "Written Test" or "Class Participation". | As Admin, I define "Written Test" as something exams can be scored on. |
| **Assessment Criteria Group** | 1 | Groups related criteria together, e.g. "Internal Assessment". | As Admin, I bucket several criteria under "Internal Assessment". |
| **Assessment Group** | 7 | A category of exams, e.g. "Mid Term" or "Final Term" (can be nested). | As Admin, I create "Mid Term Exams" as a category to organize assessment plans under. |
| **Assessment Plan** | 23 | The actual exam schedule: this class, this course, exam date/time, room, examiner, max marks, and which criteria will be scored. | As a Teacher, I schedule a Math mid-term for "Grade 10 - Section A" on a specific date with 100 max marks. |
| **Assessment Plan Criteria** | 3 | Child table — the criteria and max score for one Assessment Plan. | As a Teacher, I split the 100 marks into "Written (70)" and "Viva (30)". |
| **Assessment Result** | 21 | One student's result for one Assessment Plan — total score, grade, comments. | As a Teacher, I enter that this student scored 85/100 and got grade "A". |
| **Assessment Result Detail** | 5 | Child table — the score breakdown per criteria for one result. | As a Teacher, I record 60/70 for "Written" and 25/30 for "Viva" for this student. |
| **Assessment Result Tool** | 5 | A bulk-action screen — enter results for a whole class at once instead of one student at a time. | As a Teacher, I open one screen and enter marks for all 30 students in the class. |
| **Course Assessment Criteria** | 3 | Child table inside Course — default weightage for each criteria for that subject. | As Admin, I set that "Written Test" is worth 70% of the grade by default for Math. |
| **Grading Scale** | 5 | Defines grade bands, e.g. 90-100 = "A+". | As Admin, I set up the school's grading scale once, and it's reused everywhere. |
| **Grading Scale Interval** | 3 | Child table — one grade band row (e.g. threshold 90 → grade "A+"). | As Admin, I add the row "90 and above = A+" to the grading scale. |
| **Student Report Generation Tool** | 17 | A screen that generates a printable report card for a student or a whole class. | As a Teacher, I generate report cards for all students in my class at the end of term. |

---

## 9. Fees & Payments

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Fee Category** | 4 | A type of fee, e.g. "Tuition Fee" or "Transport Fee". | As Accounts, I create a "Transport Fee" category to bill separately from tuition. |
| **Fee Category Default** | 3 | Child table — accounting details (which account/cost center) tied to a Fee Category, per company. | (Internal accounting setup — not usually shown to end users.) |
| **Fee Component** | 7 | Child table — one line item (a Fee Category + an amount) used inside a Fee Structure, Fee Schedule, or an actual bill. | As Accounts, I add "Tuition Fee: ₹10,000" as one line in this fee template. |
| **Fee Structure** | 19 | A reusable **template**: "for Program X, Term Y, these are the fee components and total" — not billed to anyone yet, just a blueprint. | As Accounts, I create a fee template for "Grade 10, Term 1" once, then reuse it every year. |
| **Fee Schedule** | 35 | Takes a Fee Structure and actually **generates real bills** for a whole Program or class on a due date. | As Accounts, I run the fee template against "Grade 10, Section A" and it creates bills for all 30 students at once. |
| **Fee Schedule Details** | 3 | Child table — month-by-month installment breakdown inside a Fee Schedule. | As Accounts, I split the year's fee into 3 monthly installments. |
| **Fee Schedule Program** | 3 | Child table — which Program(s)/batches a Fee Schedule applies to. | As Accounts, I apply this fee schedule to "Grade 10" and "Grade 11". |
| **Fee Schedule Student Group** | 2 | Child table — which class(es) (Student Groups) a Fee Schedule applies to. | As Accounts, I apply this fee schedule only to "Section A", not the whole grade. |
| **Fees** | 46 | The actual **individual bill/invoice** for ONE student, generated from a Fee Schedule (or created manually). This is what a student/parent actually pays against. | As a Parent, I see my child's bill for ₹10,000 due on 1 Oct, and I pay it. |
| **Program Fee** | 6 | Child table inside Program Enrollment — a simpler, direct way to attach fee lines to one student's enrollment (without going through a Fee Schedule). | As Accounts, I add a one-off fee directly to a single student's enrollment. |
| **Payment Record** | 24 | Stores the result of an online payment (e.g. via Razorpay) against a Fees bill — order ID, payment ID, success/failure. | As a Parent, after I pay online, the system records the payment ID and marks my bill as paid. |

---

## 10. Quizzes & Learning Content

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Question** | 3 | One quiz question, with its answer options. | As a Teacher, I write a question: "What is 2+2?" with 4 options. |
| **Options** | 2 | Child table — one answer choice (text + whether it's correct) for a Question. | As a Teacher, I mark "4" as the correct option. |
| **Quiz** | 9 | A quiz made of several Questions — has a passing score, time limit, and max attempts. | As a Teacher, I build a 10-question quiz with a 15-minute time limit. |
| **Quiz Question** | 2 | Child table — links Questions into a Quiz. | As a Teacher, I add 10 questions to my quiz. |
| **Quiz Activity** | 15 | One student's attempt at a Quiz — their score, time taken, pass/fail. | As a Student, I take the quiz and my score is recorded automatically. |
| **Quiz Result** | 3 | Child table — which option the student picked for each question in that attempt. | As a Teacher, I can review exactly which answers this student got wrong. |
| **Course Activity** | 6 | A log of a student engaging with course content (watched a video, read an article) — used for progress tracking. | As a Student, my progress is tracked as I go through course material. |
| **Article** | 4 | A simple content page (title, author, text) — used for reading material or school announcements. | As a Teacher, I publish a short reading article for my class. |

---

## 11. Logs & Settings

| DocType | Fields | What it means | Example user story |
|---|---|---|---|
| **Student Log** | 11 | A free-text note about a student added by staff, e.g. "counseling session" or "won a competition". | As a Teacher, I log that a student needs extra support in Math. |
| **Education Settings** | 24 | The one global settings screen — current academic year/term, feature toggles, payment gateway keys, school name/logo. | As Admin, I set the "current academic year" once, and every screen defaults to it. |

---

## 12. Quick summary — the ones that matter most for frontend work

If you only remember a handful of these, remember these seven — they're the backbone of almost every screen:

1. **Student Applicant** — the application form (before approval)
2. **Student** — the approved, official student profile
3. **Program** — the "grade/level" (e.g. Grade 10)
4. **Program Enrollment** — links a student to a Program for a year
5. **Student Group** — **the actual class/section** students are grouped into
6. **Student Attendance** — daily attendance per class
7. **Fees** — the actual bill a student/parent pays

Everything else (fee templates, quiz internals, bulk tools, logs) supports these seven in some way.
