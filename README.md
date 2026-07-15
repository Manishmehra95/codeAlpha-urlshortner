# CodeAlpha project
url shortner
# 🔗 CodeAlpha URL Shortener

A simple and responsive URL Shortener built using **Node.js**, **Express.js**, and **MongoDB**. This application converts long URLs into short, shareable links and redirects users to the original website using the generated short URL.

---

## 🚀 Features

- ✅ Shorten long URLs
- ✅ Generate unique short codes
- ✅ Custom alias support
- ✅ URL validation
- ✅ Redirect to original URL
- ✅ Store URLs in MongoDB
- ✅ Click tracking
- ✅ QR Code generation
- ✅ Copy shortened URL
- ✅ Delete shortened URLs
- ✅ Responsive user interface

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Packages:** nanoid, valid-url, dotenv, cors

---

## 📁 Project Structure

```
CodeAlpha_URLShortener/
│
├── config/
│   └── db.js
├── controllers/
│   └── urlController.js
├── models/
│   └── Url.js
├── routes/
│   └── urlRoutes.js
├── public/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── 404.html
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/manishmehra95/CodeAlpha_URLShortener.git
```

### 2. Navigate to Project

```bash
cd CodeAlpha_URLShortener
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Create a `.env` File

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
BASE_URL=http://localhost:5000
```

### 5. Start the Server

```bash
npm start
```

For development:

```bash
npm run dev
```

---

## 📌 API Endpoints

### Shorten URL

**POST** `/api/shorten`

Request

```json
{
  "originalUrl": "https://www.google.com"
}
```

Response

```json
{
  "success": true,
  "data": {
    "shortUrl": "http://localhost:5000/abc123"
  }
}
```

---

### Redirect

```
GET /:shortCode
```

Example

```
http://localhost:5000/abc123
```

Automatically redirects to the original URL.

---

### Get URL Statistics

```
GET /api/stats/:shortCode
```

---

### Delete URL

```
DELETE /api/url/:shortCode
```

---

## 📸 Screenshots

Add screenshots of:

- Home Page
- URL Shortened Successfully
- QR Code
- MongoDB Collection
- Redirect Working

---

## 🔮 Future Improvements

- User Authentication
- Custom Dashboard
- URL Analytics
- URL Expiration Notifications
- Password Protected URLs

---

## 👨‍💻 Author

**Manish Mehra**

- 🎓 BCA Student
- 💻 Full Stack Web Developer
- 🌱 Learning Java, Node.js, MongoDB

GitHub: https://github.com/Manishmehra95
LinkedIn: https://www.linkedin.com/in/manish-mehra-0161043aa

---

## 📄 License

This project was developed as part of the **CodeAlpha Internship Program** for educational and learning purposes.
