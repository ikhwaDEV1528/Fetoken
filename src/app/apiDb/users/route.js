// 1. Trik Wajib Netlify: Paksa Next.js agar TIDAK konek ke DB saat build statis!
export const dynamic = 'force-dynamic';

import { db } from "@/mysql/db.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, username, email, password } = body;

    await db.execute(
      "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [id, username, email, password]
    );

    return NextResponse.json(
      { message: "User berhasil ditambahkan" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [rows] = await db.execute("SELECT * FROM users");
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Perbaikan Sintaks Router Express ke Format Standar Next.js App Router
export async function PUT(req) {
  try {
    const body = await req.json();
    const { product_id, jumlah, user } = body;
    const user_id = user?.user_id;

    const [products] = await db.query(
      `SELECT HARGA_SATUAN FROM products WHERE product_id = ?`,
      [product_id]
    );

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: 'Data tidak ditemukan!' },
        { status: 404 }
      );
    }

    const HARGA_ASLI_PRODUCTS = products[0].HARGA_SATUAN;

    const [select_orders] = await db.query(
      `SELECT id FROM orders WHERE user_id = ? AND status = ?`,
      [user_id, 'Belanja']
    );

    let order_id;
    if (select_orders.length === 0) {
      const [insertOrder] = await db.query(
        `INSERT INTO orders (user_id, status) VALUES (?, ?)`,
        [user_id, 'Belanja']
      );
      order_id = insertOrder.insertId;
    } else {
      order_id = select_orders[0].id;
    }

    const [select_list_orders] = await db.query(
      `SELECT id FROM list_orders WHERE order_id = ? AND product_id = ?`,
      [order_id, product_id]
    );

    if (select_list_orders.length === 0) {
      await db.query(
        `INSERT INTO list_orders (order_id, product_id, jumlah, HARGA_SATUAN) VALUES (?, ?, ?, ?)`,
        [order_id, product_id, jumlah, HARGA_ASLI_PRODUCTS]
      );
      return NextResponse.json(
        { message: 'Berhasil menambahkan products!' },
        { status: 200 }
      );
    } else {
      const id = select_list_orders[0].id;
      const HARGA_BARU = HARGA_ASLI_PRODUCTS * jumlah;
      await db.query(
        `UPDATE list_orders SET jumlah = ?, HARGA_SATUAN = ? WHERE id = ?`,
        [jumlah, HARGA_BARU, id]
      );
      return NextResponse.json(
        { message: 'Berhasil update jumlah product!' },
        { status: 200 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { message: err.message || err },
      { status: 500 }
    );
  }
}