import mysql from "mysql2/promise";

export const db = await mysql.createConnection({
  host: "localhost",     // kalau pake XAMPP biasanya localhost
  user: "root",          // default user XAMPP
  password: "",          // kosong (kalau kamu belum set password)
  database: "belajardb", // nama database yang udah kamu buat
});