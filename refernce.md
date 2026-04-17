```
Department of Computer Engineering
Branch: Computer Science and Design
Subject: Python And Web Programming(PWP)
Subject Code:
```
### Seminar on Project

### Title: Daily Medication Reminder

**Prepared By: RoshanNandasana(12302130501045)**

```
Guided By:
```

- Helps users manage daily medications.
- Features: Login, add meds, reminders.
- Targets patients and caregivers.
- Built with Django, HTML, CSS, JS, SQLite.
- Supports routine medication schedules through alerts

## Project Overview


- Add, view, edit, delete medications.
- Tracks status (Upcoming/Taken).
- Sends browser reminders at set times.
- Secure with user login.

## System Functionality


- **Frontend:** HTML, CSS, JS.
- **Backend:** Django, REST API.
- **Database:** SQLite with ORM.
- **Integration:** Token auth, CORS.
- **Local Run:** localhost:8000/8001.

## Technical Architecture


- One-to-Many: User to Medications.
- Ordered by time.

## Database Schema


- Register with username, email,
    password.
- Login with token-based security.
- Logout clears session.
- Protects user data.
- Modals for forms.

## User Authentication


## Dashboard Interface


```
Add & Edit
```
- Simple form to input **Name** , **Dosage** , **Time** , and **Dates**
- **Edit** existing medication details easily
- Validates fields and dates before submission
- Data saved via **API (POST / PUT)**
- **Auto-refreshes** tables after changes

```
View & Delete
```
- Displays **all medications** or **today’s schedule**
- Option to **mark doses as taken**
- **Edit / Delete** actions in a table format
- **Confirmation modal** for deletions
- Handles errors gracefully with **alerts**

## Medication Management — Add, Edit, View

## & Delete


## Medication Management — Add, Edit, View

## & Delete


- Checks time every 10
    seconds.
- Triggers popup at med time.
- Auto-marks as Taken.
- Requires notification
    permission.

## Reminders and Notifications


## API and URL Configuration


- Successful web app for medication management.
- Offers secure login and timely reminders.
- Gained skills in Django and JS integration.

## Conclusion


# Thank You


