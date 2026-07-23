import { db } from "@/mysql/db.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, username, email, password } = body;

    await db.execute(
       "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [id, username, email, password]
    );

    return new Response(
      JSON.stringify({ message: "User berhasil ditambahkan" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }, // ✅ penting
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }, // ✅ penting
      }
    );
  }
}

export async function GET() {
  try {
    const [rows] = await db.execute("SELECT * FROM users");
    return new Response(
      JSON.stringify(rows),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }, // ✅ penting
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }, // ✅ penting
      }
    );
  }
}




const router = 1;


router.put('/UPDATE_JUMLAH' , async (req, res) => {
  const {product_id , jumlah} = req.body;
  const {user_id} = req.body.user;
  
  try{
    const [products] = await db.query(`SELECT HARGA_SATUAN FROM products WHERE product_id = ?`, [product_id]);
    if(products.length == 0){
      return res.status(404).json({message:'Data tidak ditemukan!'})
    }
    
    // jika product mendapatkan data , maka ambil harga nya;
    const HARGA_ASLI_PRODUCTS = products[0].HARGA_SATUAN;

    // Lanjut Cek tabel orders;
    const [select_orders] = await db.query(`SELECT id FROM orders WHERE user_id = ? AND status = ?`, [user_id , 'Belanja']);

    // Setelah ambil data , kita akan cek apakah data nya ada atau tidak ?. Ada atau tidak tujuan kita hanya untuk mengambil id dalam orders;
    const order_id = select_orders.length == 0 ? (await db.query(`INSERT INTO orders (user_id , status) VALUES (?,?)`,[user_id , 'Belanja'])).insertId : select_orders[0].id
    
    // Setelah mendapatkan ID untuk order_id , kita perlu mengecek terlebih dahulu di list_orders sampai akhir nya edit/post data;
    const [select_list_orders] = await db.query(`SELECT id FROM list_orders WHERE order_id = ? AND products_id = ?`, [order_id,product_id]);

    // Cek apakah datanya kosong?
    if(select_list_orders.length == 0){ // Jika iya maka insert baris ke dalam list_orders
      const [insert_list_orders] = await db.query(`INSERT INTO list_orders (order_id,product_id,jumlah,HARGA_SATUAN) VALUES(?,?,?,?)`,[order_id,product_id,jumlah,HARGA_ASLI_PRODUCTS]);
      return res.status(200).json({message:'Berhasil menambahkan products!'})
    }

    else{ // jika tidak maka cukup update nilai kolom jumlah dan harga , pilih rows berdasarkan id;
      const id = select_list_orders[0].id
      const HARGA_BARU = HARGA_ASLI_PRODUCTS * jumlah;
      const [update_list_orders] = await db.query(`UPDATE list_orders SET jumlah = ? , HARGA_SATUAN = ? WHERE id = ?`,[jumlah,HARGA_BARU,id])
    }

   

  } catch(err) {
    res.status(500).json({message:err})
  }
})
