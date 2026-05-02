# Chess Master

Chess Master is a chess game web app. Either play with friends or against AI in easy, medium or hard mode

## 🚀 How to Run

### Prerequisites
- Node.js (v18+)
- MySQL (for the server)

### Setup

1. **Clone the repository**

2. **Set up the database:**
   ```sql
   mysql -u root -p < server/init.sql
   ```

3. **Configure environment variables:**
   ```bash
   cp server/.env
   # Edit server/.env with your database credentials
   ```

4. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client && npm install && cd ..

   # Install server dependencies
   cd server && npm install && cd ..
   ```

5. **Start the server:**
   ```bash
   cd server && npm start
   ```

6. **Start the client (in a new terminal):**
   ```bash
   cd client && npm run dev
   ```

7. **Open the app:**
   Navigate to `http://localhost:5173` in your browser.

---

## User Registration

<img width="698" height="673" alt="image" src="https://github.com/user-attachments/assets/cd3fe3e7-fe5c-40e8-bdf7-3cf02e00dd25" /><br/><br/>

## Home Screen

<img width="1863" height="969" alt="image" src="https://github.com/user-attachments/assets/6eac57a1-f5c8-47df-9929-014e555401c2" />


## vs. AI (medium difficulty)

<img width="1855" height="926" alt="image" src="https://github.com/user-attachments/assets/e3efd029-847a-4e4e-8d82-959a9cd981a0" />
