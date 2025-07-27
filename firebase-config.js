import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZoLi6QymN9DHKQHU9xc0atJEJw7OY4Xg",
  authDomain: "utang-1d2b4.firebaseapp.com",
  projectId: "utang-1d2b4",
  storageBucket: "utang-1d2b4.firebasestorage.app",
  messagingSenderId: "281865452329",
  appId: "1:281865452329:web:fe3a5e6ba6f59d70f31538",
  measurementId: "G-0ZJX42474G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let dataUtang = [];
let historiNama = new Set();
let historiBarang = {};
let currentPage = 1;
let perPage = 10;

async function loadData() {
  dataUtang = [];
  historiNama.clear();
  historiBarang = {};

  const utangSnap = await getDocs(collection(db, "utangs"));
  utangSnap.forEach(doc => {
    const d = doc.data();
    dataUtang.push({ id: doc.id, ...d });
    historiNama.add(d.nama);
    historiBarang[d.barang] = d.jumlah;
  });

  renderTabel();
  renderDatalist();
}

window.onload = async function () {
  await loadData();
};

async function tambahUtang() {
  const nama = document.getElementById('nama').value.trim();
  const barang = document.getElementById('barang').value.trim();
  const jumlah = parseInt(document.getElementById('jumlah').value);

  if (!nama || !barang || isNaN(jumlah)) {
    alert("Mohon lengkapi nama, barang, dan jumlah.");
    return;
  }

   const utangBaru = { nama, barang, jumlah };

  // Simpan ke Firebase
  try {
    const db = window.firebaseDB;
    const { collection, addDoc } = window.firestore;
    await addDoc(collection(db, "dataUtang"), utangBaru);

    // Refresh tabel
    await loadDataDariFirebase();
    document.getElementById('nama').value = '';
    document.getElementById('barang').value = '';
    document.getElementById('jumlah').value = '';
  } catch (e) {
    console.error("Gagal menambah utang: ", e);
    alert("Gagal menyimpan ke database.");
  }
}

function renderTabel() {
  const tbody = document.querySelector("#tabelUtang tbody");
  tbody.innerHTML = '';

  const sorted = [...dataUtang].sort((a, b) => a.nama.localeCompare(b.nama));
  const start = (currentPage - 1) * perPage;
  const pageData = sorted.slice(start, start + perPage);

  pageData.forEach((utang, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${utang.nama}</td>
      <td>${utang.barang}</td>
      <td>Rp${utang.jumlah.toLocaleString()}</td>
      <td><button onclick="hapusUtang('${utang.id}')">Lunasi</button></td>
    `;
    tbody.appendChild(row);
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  document.getElementById("pageInfo").textContent = `Halaman ${currentPage} dari ${totalPages}`;
}

function renderDatalist() {
  const daftarNama = document.getElementById('daftarNama');
  daftarNama.innerHTML = '';
  const hapusSelect = document.getElementById('hapusNamaSelect');
  hapusSelect.innerHTML = '';

  Array.from(historiNama).sort().forEach(nama => {
    const option = document.createElement('option');
    option.value = nama;
    daftarNama.appendChild(option);

    const selectOption = document.createElement('option');
    selectOption.value = nama;
    selectOption.textContent = nama;
    hapusSelect.appendChild(selectOption);
  });

  const daftarBarang = document.getElementById('daftarBarang');
  daftarBarang.innerHTML = '';
  Object.keys(historiBarang).sort().forEach(barang => {
    const option = document.createElement('option');
    option.value = barang;
    daftarBarang.appendChild(option);
  });
}

function isiHargaBarang() {
  const barang = document.getElementById('barang').value.trim();
  if (barang in historiBarang) {
    document.getElementById('jumlah').value = historiBarang[barang];
  }
}

async function hapusUtang(id) {
  if (confirm("Apakah utang ini sudah lunas?")) {
    await deleteDoc(doc(db, "utangs", id));
    await loadData();
  }
}

function eksporExcel() {
  if (dataUtang.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const sorted = [...dataUtang].sort((a, b) => a.nama.localeCompare(b.nama));
  const worksheetData = [["No", "Nama", "Barang", "Jumlah (Rp)"]];

  sorted.forEach((item, index) => {
    worksheetData.push([
      index + 1,
      item.nama,
      item.barang,
      `Rp. ${item.jumlah.toLocaleString()}`
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Utang");
  XLSX.writeFile(workbook, "data_utang.xlsx");
}

async function hapusNamaLog() {
  const select = document.getElementById('hapusNamaSelect');
  const namaDipilih = select.value;

  if (!namaDipilih || !historiNama.has(namaDipilih)) {
    alert("Pilih nama yang valid.");
    return;
  }

  if (confirm(`Yakin ingin menghapus "${namaDipilih}" dari daftar log?`)) {
    // Hapus semua data dengan nama tersebut
    const utangSnap = await getDocs(collection(db, "utangs"));
    for (const d of utangSnap.docs) {
      if (d.data().nama === namaDipilih) {
        await deleteDoc(doc(db, "utangs", d.id));
      }
    }
    await loadData();
  }
}

function changePerPage() {
  perPage = parseInt(document.getElementById('perPage').value);
  currentPage = 1;
  renderTabel();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTabel();
  }
}

function nextPage() {
  const totalPages = Math.ceil(dataUtang.length / perPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTabel();
  }
}
