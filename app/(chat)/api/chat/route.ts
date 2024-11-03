import { convertToCoreMessages, Message, streamText } from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { auth } from '@/app/(auth)/auth';
import { deleteChatById, getChatById, saveChat } from '@/db/queries';
import { Model, models } from '@/lib/model';

export async function POST(request: Request) {
  const {
    id,
    messages,
    model,
  }: { id: string; messages: Array<Message>; model: Model['name'] } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!models.find((m) => m.name === model)) {
    return new Response('Model not found', { status: 404 });
  }

  const prompt = `
Nama Anda adalah AIVA

Buat deskripsi atau instruksi yang menjelaskan bagaimana AIVA, asisten virtual berbasis AI, dapat mendukung kebijakan berbasis data di BPJS Kesehatan, dalam bahasa Indonesia.

# Langkah-Langkah

- Jelaskan tujuan dari penggunaan AIVA dalam konteks kebijakan BPJS Kesehatan.
- Sebutkan bagaimana AIVA dapat membantu dalam analisis data dan pengambilan keputusan.
- Gambarkan skenario spesifik di mana AIVA berfungsi untuk meningkatkan efisiensi pelaksanaan kebijakan.
- Berikan contoh bagaimana AIVA dapat berinteraksi dengan pengguna dan memproses data.
- Anda harus menjawab pertanyaan berdasarkan perhitungan data yang diberikan
- Bulan ini adalah bulan November 2024

# Format Output

- Tulisan dalam bentuk esai pendek atau artikel.
- Gunakan paragraf terstruktur dan bahasa yang jelas.
- Panjang: 3-5 paragraf.

# Contoh [opsional]

**Input:** 
- Tujuan: Meningkatkan efisiensi pengolahan data kesehatan.
- Peran AIVA: Analisis data klaim, memberikan rekomendasi kebijakan berdasarkan tren data.

**Output:** 
AIVA adalah asisten virtual berbasis AI yang dirancang untuk mendukung kebijakan berbasis data di BPJS Kesehatan. Tujuan utama dari AIVA adalah untuk meningkatkan efisiensi dalam memproses dan menganalisis data klaim kesehatan, sehingga memungkinkan manajer kebijakan untuk membuat keputusan yang lebih tepat waktu dan tepat sasaran.

Misalnya, AIVA dapat menganalisis tren pengajuan klaim setiap bulan dan mengidentifikasi pola yang menunjukkan lonjakan tertentu dalam penyakit musiman. Dengan data ini, tim kebijakan dapat merumuskan strategi untuk mengatasi peningkatan beban kerja dan mengalokasikan sumber daya dengan lebih efektif.

Dalam interaksi sehari-hari, AIVA dapat memberikan rekomendasi berbasis data kepada pengguna BPJS Kesehatan, seperti mengingatkan batas waktu pengajuan klaim atau memberikan wawasan tentang kebijakan baru yang diberlakukan. Hal ini bertujuan untuk memastikan informasi yang dibutuhkan tersedia dan dapat diakses dengan mudah, mendukung kebijakan berbasis data dengan efisien.

Berikut adalah data pasien untuk klaim asuransi BPJS:
ID Pasien,Nama Pasien,Jenis Kelamin,Usia,Diagnosa,Tanggal Kunjungan,Status Klaim,Tanggal Klaim Disetujui,Total Biaya,Biaya Ditanggung BPJS,Sisa Biaya,Faskes Tujuan,Poli Tujuan,Obat yang Ditanggung,Durasi Perawatan
P001,Pasien A,Wanita,66,Infeksi Saluran Pernafasan Akut,2024-04-25,Ditolak,-,9938699,0,9938699,RS E,Poli Saraf,"Paracetamol, Salbutamol, Insulin",-
P002,Pasien B,Wanita,26,Gagal Ginjal Kronis,2024-02-27,Tertunda,-,7051604,0,7051604,RS B,Poli Paru,Amlodipine,-
P003,Pasien C,Wanita,22,Diabetes Melitus,2024-03-23,Ditolak,-,9027748,0,9027748,RS E,Poli Paru,Salbutamol,-
P004,Pasien D,Wanita,29,Tuberkulosis,2024-05-11,Ditolak,-,8574464,0,8574464,RS B,Poli Penyakit Dalam,Metformin,-
P005,Pasien E,Wanita,31,Infeksi Saluran Pernafasan Akut,2024-11-24,Tertunda,-,6396668,0,6396668,RS G,Poli Paru,Paracetamol,-
P006,Pasien F,Wanita,42,Penyakit Jantung,2024-11-16,Tertunda,-,8306331,0,8306331,RS B,Poli Jantung,"Salbutamol, Metformin",-
P007,Pasien G,Wanita,26,Hipertensi,2024-11-23,Tertunda,-,1531541,0,1531541,RS A,Poli Paru,Aspirin,-
P008,Pasien H,Wanita,68,Asma,2024-01-24,Disetujui,2024-02-01,4148284,4148284,0,RS D,Poli Penyakit Dalam,"Metformin, Salbutamol, Aspirin",8 Hari
P009,Pasien I,Pria,70,Hipertensi,2024-03-16,Disetujui,2024-03-20,12834901,12834901,0,RS B,Poli Paru,Amlodipine,1 Hari
P010,Pasien J,Pria,40,Infeksi Saluran Pernafasan Akut,2024-05-17,Tertunda,-,7407161,0,7407161,RS E,Poli Saraf,Metformin,-
P011,Pasien K,Pria,29,Asma,2024-05-10,Disetujui,2024-05-14,4974367,4974367,0,RS F,Poli Paru,Insulin,7 Hari
P012,Pasien L,Pria,51,Diabetes Melitus,2024-11-04,Ditolak,-,3412550,0,3412550,RS C,Poli Paru,Salbutamol,-
P013,Pasien M,Pria,26,Penyakit Jantung,2024-07-28,Disetujui,2024-08-02,14894605,14894605,0,RS G,Poli Penyakit Dalam,"Aspirin, Ramipril",5 Hari
P014,Pasien N,Pria,60,Diabetes Melitus,2024-09-20,Ditolak,-,11463010,0,11463010,RS B,Poli Jantung,"Amlodipine, Paracetamol",-
P015,Pasien O,Pria,57,Penyakit Jantung,2024-11-26,Tertunda,-,13641436,0,13641436,RS B,Poli Umum,"Metformin, Aspirin",-
P016,Pasien P,Pria,30,Gagal Ginjal Kronis,2024-03-14,Disetujui,2024-03-24,11195273,11195273,0,RS E,Poli Paru,Metformin,10 Hari
P017,Pasien Q,Pria,52,Hipertensi,2024-08-14,Ditolak,-,12540055,0,12540055,RS C,Poli Umum,Amlodipine,-
P018,Pasien R,Wanita,55,Gagal Ginjal Kronis,2024-10-25,Tertunda,-,14966766,0,14966766,RS B,Poli Umum,Ramipril,-
P019,Pasien S,Wanita,70,Hepatitis,2024-03-10,Disetujui,2024-03-15,816363,816363,0,RS A,Poli Saraf,"Aspirin, Salbutamol",10 Hari
P020,Pasien T,Pria,64,Asma,2024-01-31,Tertunda,-,9020258,0,9020258,RS C,Poli Umum,"Paracetamol, Ramipril",-
P021,Pasien U,Pria,60,Hepatitis,2024-09-06,Tertunda,-,11394660,0,11394660,RS F,Poli Saraf,"Aspirin, Salbutamol, Amlodipine",-
P022,Pasien V,Wanita,50,Gagal Ginjal Kronis,2024-04-01,Ditolak,-,7204851,0,7204851,RS C,Poli Umum,Metformin,-
P023,Pasien W,Pria,45,Diabetes Melitus,2024-01-14,Disetujui,2024-01-23,7666517,7666517,0,RS E,Poli Paru,"Salbutamol, Aspirin, Paracetamol",10 Hari
P024,Pasien X,Pria,43,Infeksi Saluran Pernafasan Akut,2024-05-17,Ditolak,-,3261415,0,3261415,RS G,Poli Umum,Ramipril,-
P025,Pasien Y,Wanita,41,Hepatitis,2024-02-08,Tertunda,-,8193179,0,8193179,RS G,Poli Penyakit Dalam,"Paracetamol, Metformin",-
P026,Pasien Z,Wanita,52,Demam Berdarah,2024-11-04,Tertunda,-,9099194,0,9099194,RS F,Poli Paru,"Insulin, Metformin, Salbutamol",-
P027,Pasien A,Pria,53,Infeksi Saluran Pernafasan Akut,2024-09-20,Tertunda,-,14372256,0,14372256,RS G,Poli Saraf,"Aspirin, Amlodipine, Insulin",-
P028,Pasien B,Pria,71,Diabetes Melitus,2024-11-12,Disetujui,2024-11-14,11590505,11590505,0,RS C,Poli Saraf,"Metformin, Aspirin",2 Hari
P029,Pasien C,Pria,58,Stroke,2024-01-03,Disetujui,2024-01-06,8552937,8552937,0,RS F,Poli Umum,"Insulin, Paracetamol, Salbutamol",4 Hari
P030,Pasien D,Pria,31,Hipertensi,2024-09-22,Ditolak,-,1202215,0,1202215,RS A,Poli Paru,"Paracetamol, Insulin, Aspirin",-
P031,Pasien E,Wanita,74,Tuberkulosis,2024-01-30,Tertunda,-,4031575,0,4031575,RS D,Poli Penyakit Dalam,"Salbutamol, Paracetamol, Insulin",-
P032,Pasien F,Wanita,58,Hipertensi,2024-05-23,Disetujui,2024-05-25,13153907,13153907,0,RS A,Poli Umum,"Amlodipine, Salbutamol",2 Hari
P033,Pasien G,Wanita,59,Tuberkulosis,2024-07-16,Ditolak,-,9291658,0,9291658,RS B,Poli Paru,"Ramipril, Paracetamol, Amlodipine",-
P034,Pasien H,Wanita,62,Penyakit Jantung,2024-11-18,Disetujui,2024-11-28,2340020,2340020,0,RS C,Poli Paru,Ramipril,6 Hari
P035,Pasien I,Pria,63,Penyakit Jantung,2024-07-07,Disetujui,2024-07-08,6364458,6364458,0,RS C,Poli Paru,"Aspirin, Paracetamol, Salbutamol",6 Hari
P036,Pasien J,Wanita,47,Gagal Ginjal Kronis,2024-08-18,Disetujui,2024-08-22,9705964,9705964,0,RS F,Poli Jantung,"Paracetamol, Amlodipine",2 Hari
P037,Pasien K,Wanita,53,Hipertensi,2024-05-24,Ditolak,-,11627461,0,11627461,RS A,Poli Jantung,Salbutamol,-
P038,Pasien L,Wanita,70,Stroke,2024-05-18,Disetujui,2024-05-27,11751454,11751454,0,RS A,Poli Penyakit Dalam,"Amlodipine, Insulin, Metformin",8 Hari
P039,Pasien M,Wanita,41,Hipertensi,2024-06-06,Ditolak,-,9988817,0,9988817,RS E,Poli Umum,"Paracetamol, Insulin, Salbutamol",-
P040,Pasien N,Pria,33,Penyakit Jantung,2024-10-31,Ditolak,-,3066594,0,3066594,RS F,Poli Paru,"Ramipril, Amlodipine",-
P041,Pasien O,Wanita,45,Stroke,2024-01-20,Disetujui,2024-01-28,1804645,1804645,0,RS E,Poli Jantung,Ramipril,6 Hari
P042,Pasien P,Wanita,77,Hipertensi,2024-01-27,Disetujui,2024-02-02,7125481,7125481,0,RS F,Poli Umum,"Salbutamol, Insulin, Paracetamol",4 Hari
P043,Pasien Q,Wanita,79,Demam Berdarah,2024-09-25,Ditolak,-,14710034,0,14710034,RS F,Poli Jantung,"Aspirin, Amlodipine, Ramipril",-
P044,Pasien R,Wanita,37,Diabetes Melitus,2024-09-14,Tertunda,-,4739465,0,4739465,RS A,Poli Saraf,"Ramipril, Metformin",-
P045,Pasien S,Wanita,34,Gagal Ginjal Kronis,2024-02-22,Tertunda,-,11322790,0,11322790,RS E,Poli Penyakit Dalam,Amlodipine,-
P046,Pasien T,Wanita,49,Hipertensi,2024-03-07,Disetujui,2024-03-14,4239846,4239846,0,RS B,Poli Jantung,Aspirin,1 Hari
P047,Pasien U,Pria,29,Infeksi Saluran Pernafasan Akut,2024-02-13,Ditolak,-,10601684,0,10601684,RS F,Poli Umum,Amlodipine,-
P048,Pasien V,Pria,68,Demam Berdarah,2024-12-05,Tertunda,-,4180565,0,4180565,RS D,Poli Saraf,"Aspirin, Insulin, Ramipril",-
P049,Pasien W,Pria,63,Infeksi Saluran Pernafasan Akut,2024-10-29,Ditolak,-,7550144,0,7550144,RS D,Poli Paru,"Amlodipine, Ramipril, Paracetamol",-
P050,Pasien X,Wanita,71,Demam Berdarah,2024-07-02,Ditolak,-,4390222,0,4390222,RS F,Poli Saraf,"Metformin, Aspirin, Salbutamol",-
P051,Pasien Y,Pria,78,Tuberkulosis,2024-06-18,Tertunda,-,14373902,0,14373902,RS A,Poli Saraf,Ramipril,-
P052,Pasien Z,Wanita,28,Diabetes Melitus,2024-08-29,Ditolak,-,4988322,0,4988322,RS B,Poli Paru,Ramipril,-
P053,Pasien A,Wanita,30,Demam Berdarah,2024-01-13,Ditolak,-,2934913,0,2934913,RS F,Poli Jantung,Insulin,-
P054,Pasien B,Pria,36,Infeksi Saluran Pernafasan Akut,2024-04-17,Disetujui,2024-04-20,812843,812843,0,RS B,Poli Jantung,"Ramipril, Salbutamol, Insulin",6 Hari
P055,Pasien C,Wanita,36,Stroke,2024-06-19,Disetujui,2024-06-28,9130685,9130685,0,RS B,Poli Umum,Amlodipine,8 Hari
P056,Pasien D,Wanita,57,Tuberkulosis,2024-07-08,Tertunda,-,1474582,0,1474582,RS E,Poli Umum,"Paracetamol, Amlodipine",-
P057,Pasien E,Wanita,52,Asma,2024-04-08,Ditolak,-,12368791,0,12368791,RS E,Poli Penyakit Dalam,"Insulin, Salbutamol, Amlodipine",-
P058,Pasien F,Wanita,28,Hepatitis,2024-01-17,Ditolak,-,7937652,0,7937652,RS F,Poli Paru,Amlodipine,-
P059,Pasien G,Wanita,73,Hipertensi,2024-08-16,Disetujui,2024-08-21,2750204,2750204,0,RS G,Poli Saraf,Metformin,3 Hari
P060,Pasien H,Pria,46,Stroke,2024-02-18,Ditolak,-,14545009,0,14545009,RS A,Poli Saraf,Salbutamol,-
P061,Pasien I,Wanita,78,Penyakit Jantung,2024-08-23,Ditolak,-,7546278,0,7546278,RS G,Poli Paru,Metformin,-
P062,Pasien J,Pria,41,Demam Berdarah,2024-12-23,Ditolak,-,8380335,0,8380335,RS B,Poli Jantung,"Aspirin, Metformin",-
P063,Pasien K,Wanita,52,Penyakit Jantung,2024-12-18,Tertunda,-,11925031,0,11925031,RS G,Poli Jantung,"Paracetamol, Insulin, Metformin",-
P064,Pasien L,Wanita,41,Diabetes Melitus,2024-09-16,Disetujui,2024-09-24,10461470,10461470,0,RS C,Poli Umum,"Insulin, Paracetamol, Amlodipine",2 Hari
P065,Pasien M,Wanita,41,Stroke,2024-09-02,Ditolak,-,1624173,0,1624173,RS F,Poli Jantung,"Salbutamol, Amlodipine",-
P066,Pasien N,Pria,80,Demam Berdarah,2024-03-23,Tertunda,-,8606372,0,8606372,RS G,Poli Saraf,Aspirin,-
P067,Pasien O,Pria,54,Diabetes Melitus,2024-08-12,Ditolak,-,12612052,0,12612052,RS E,Poli Saraf,Salbutamol,-
P068,Pasien P,Pria,20,Demam Berdarah,2024-10-09,Tertunda,-,3499507,0,3499507,RS A,Poli Saraf,"Paracetamol, Metformin",-
P069,Pasien Q,Pria,34,Gagal Ginjal Kronis,2024-02-09,Tertunda,-,2415071,0,2415071,RS G,Poli Umum,"Insulin, Paracetamol",-
P070,Pasien R,Pria,24,Gagal Ginjal Kronis,2024-02-22,Disetujui,2024-03-03,14795816,14795816,0,RS C,Poli Jantung,"Ramipril, Paracetamol",9 Hari
P071,Pasien S,Wanita,64,Demam Berdarah,2024-10-30,Ditolak,-,5858242,0,5858242,RS B,Poli Saraf,Metformin,-
P072,Pasien T,Wanita,74,Demam Berdarah,2024-05-19,Tertunda,-,695351,0,695351,RS F,Poli Paru,Salbutamol,-
P073,Pasien U,Wanita,80,Diabetes Melitus,2024-07-19,Disetujui,2024-07-29,1727708,1727708,0,RS D,Poli Paru,"Salbutamol, Ramipril",6 Hari
P074,Pasien V,Wanita,75,Tuberkulosis,2024-06-22,Tertunda,-,4518067,0,4518067,RS F,Poli Paru,Paracetamol,-
P075,Pasien W,Pria,43,Demam Berdarah,2024-06-15,Disetujui,2024-06-21,9981644,9981644,0,RS E,Poli Jantung,"Amlodipine, Aspirin, Ramipril",1 Hari
P076,Pasien X,Pria,40,Gagal Ginjal Kronis,2024-04-13,Tertunda,-,9515467,0,9515467,RS E,Poli Penyakit Dalam,"Ramipril, Salbutamol",-
P077,Pasien Y,Pria,35,Hepatitis,2024-08-14,Ditolak,-,8271606,0,8271606,RS F,Poli Jantung,"Paracetamol, Salbutamol, Aspirin",-
P078,Pasien Z,Wanita,52,Diabetes Melitus,2024-04-19,Ditolak,-,7097920,0,7097920,RS C,Poli Umum,"Insulin, Paracetamol, Aspirin",-
P079,Pasien A,Pria,54,Stroke,2024-01-22,Ditolak,-,5501741,0,5501741,RS B,Poli Penyakit Dalam,"Aspirin, Metformin, Insulin",-
P080,Pasien B,Pria,78,Penyakit Jantung,2024-01-14,Tertunda,-,3228219,0,3228219,RS G,Poli Jantung,"Insulin, Aspirin",-
P081,Pasien C,Wanita,45,Penyakit Jantung,2024-01-13,Tertunda,-,13307289,0,13307289,RS F,Poli Paru,"Insulin, Salbutamol, Amlodipine",-
P082,Pasien D,Wanita,45,Diabetes Melitus,2024-05-22,Ditolak,-,11447906,0,11447906,RS G,Poli Umum,Amlodipine,-
P083,Pasien E,Wanita,61,Infeksi Saluran Pernafasan Akut,2024-08-05,Tertunda,-,13662440,0,13662440,RS C,Poli Saraf,"Paracetamol, Insulin, Ramipril",-
P084,Pasien F,Wanita,24,Hepatitis,2024-05-29,Ditolak,-,12993663,0,12993663,RS D,Poli Penyakit Dalam,Ramipril,-
P085,Pasien G,Pria,47,Gagal Ginjal Kronis,2024-01-06,Ditolak,-,11680340,0,11680340,RS D,Poli Saraf,Salbutamol,-
P086,Pasien H,Wanita,58,Asma,2024-12-12,Ditolak,-,8528067,0,8528067,RS F,Poli Umum,"Salbutamol, Insulin",-
P087,Pasien I,Wanita,73,Tuberkulosis,2024-01-22,Disetujui,2024-01-24,3311958,3311958,0,RS D,Poli Paru,"Paracetamol, Ramipril, Amlodipine",10 Hari
P088,Pasien J,Wanita,71,Hepatitis,2024-09-04,Disetujui,2024-09-09,3981475,3981475,0,RS B,Poli Penyakit Dalam,"Ramipril, Aspirin",4 Hari
P089,Pasien K,Wanita,54,Hipertensi,2024-02-08,Ditolak,-,12375650,0,12375650,RS F,Poli Umum,"Insulin, Metformin",-
P090,Pasien L,Wanita,53,Hipertensi,2024-06-07,Disetujui,2024-06-12,7544018,7544018,0,RS A,Poli Umum,"Metformin, Paracetamol",9 Hari
P091,Pasien M,Wanita,63,Gagal Ginjal Kronis,2024-05-13,Tertunda,-,2515833,0,2515833,RS G,Poli Jantung,"Paracetamol, Aspirin, Salbutamol",-
P092,Pasien N,Pria,53,Asma,2024-01-11,Disetujui,2024-01-18,3119267,3119267,0,RS B,Poli Saraf,"Insulin, Salbutamol",2 Hari
P093,Pasien O,Wanita,50,Hepatitis,2024-03-04,Disetujui,2024-03-06,3024184,3024184,0,RS F,Poli Penyakit Dalam,"Amlodipine, Paracetamol",4 Hari
P094,Pasien P,Wanita,48,Asma,2024-09-16,Disetujui,2024-09-26,5643028,5643028,0,RS F,Poli Penyakit Dalam,"Aspirin, Amlodipine",6 Hari
P095,Pasien Q,Pria,31,Stroke,2024-08-06,Ditolak,-,3139088,0,3139088,RS E,Poli Saraf,"Amlodipine, Paracetamol",-
P096,Pasien R,Pria,70,Stroke,2024-05-23,Ditolak,-,5916474,0,5916474,RS A,Poli Paru,Ramipril,-
P097,Pasien S,Pria,67,Demam Berdarah,2024-02-24,Ditolak,-,10672248,0,10672248,RS D,Poli Penyakit Dalam,Salbutamol,-
P098,Pasien T,Pria,56,Demam Berdarah,2024-07-27,Disetujui,2024-07-31,12082404,12082404,0,RS B,Poli Saraf,Metformin,8 Hari
P099,Pasien U,Wanita,41,Diabetes Melitus,2024-08-10,Tertunda,-,10213887,0,10213887,RS C,Poli Penyakit Dalam,"Metformin, Aspirin",-
P100,Pasien V,Wanita,67,Gagal Ginjal Kronis,2024-06-23,Tertunda,-,2567602,0,2567602,RS D,Poli Umum,Amlodipine,-
P001,Pasien A,Wanita,40,Asma,2024-06-24,Ditolak,-,887032,0,887032,RS G,Poli Jantung,"Aspirin, Insulin, Paracetamol",-
P002,Pasien B,Pria,62,Stroke,2024-03-01,Ditolak,-,5772315,0,5772315,RS G,Poli Jantung,Salbutamol,-
P003,Pasien C,Wanita,80,Hepatitis,2024-06-15,Tertunda,-,12720350,0,12720350,RS B,Poli Saraf,"Paracetamol, Metformin, Aspirin",-
P004,Pasien D,Wanita,64,Hepatitis,2024-04-13,Tertunda,-,12543177,0,12543177,RS D,Poli Penyakit Dalam,"Insulin, Amlodipine",-
P005,Pasien E,Wanita,64,Infeksi Saluran Pernafasan Akut,2024-06-28,Ditolak,-,4679204,0,4679204,RS A,Poli Saraf,Aspirin,-
P006,Pasien F,Pria,78,Infeksi Saluran Pernafasan Akut,2024-03-06,Tertunda,-,1326116,0,1326116,RS D,Poli Umum,Insulin,-
P007,Pasien G,Wanita,35,Gagal Ginjal Kronis,2024-11-12,Disetujui,2024-11-20,4424711,4424711,0,RS A,Poli Saraf,Insulin,3 Hari
P008,Pasien H,Wanita,59,Hipertensi,2024-06-16,Ditolak,-,1624252,0,1624252,RS E,Poli Paru,"Paracetamol, Amlodipine",-
P009,Pasien I,Pria,74,Diabetes Melitus,2024-09-07,Ditolak,-,5899868,0,5899868,RS E,Poli Jantung,"Aspirin, Amlodipine, Insulin",-
P010,Pasien J,Pria,79,Asma,2024-06-13,Tertunda,-,2611168,0,2611168,RS G,Poli Penyakit Dalam,Ramipril,-
P011,Pasien K,Pria,55,Hepatitis,2024-05-17,Ditolak,-,11015753,0,11015753,RS G,Poli Saraf,"Paracetamol, Insulin",-
P012,Pasien L,Wanita,54,Penyakit Jantung,2024-02-01,Ditolak,-,8854440,0,8854440,RS A,Poli Jantung,Amlodipine,-
P013,Pasien M,Wanita,48,Infeksi Saluran Pernafasan Akut,2024-06-23,Disetujui,2024-06-29,14328107,14328107,0,RS D,Poli Saraf,"Amlodipine, Salbutamol",5 Hari
P014,Pasien N,Wanita,76,Stroke,2024-06-21,Ditolak,-,11522288,0,11522288,RS G,Poli Paru,Amlodipine,-
P015,Pasien O,Wanita,20,Hipertensi,2024-06-20,Ditolak,-,9976726,0,9976726,RS F,Poli Saraf,"Insulin, Ramipril, Metformin",-
P016,Pasien P,Pria,39,Stroke,2024-10-11,Tertunda,-,2780808,0,2780808,RS G,Poli Penyakit Dalam,Aspirin,-
P017,Pasien Q,Pria,53,Demam Berdarah,2024-11-04,Disetujui,2024-11-12,1859485,1859485,0,RS B,Poli Jantung,"Paracetamol, Amlodipine, Salbutamol",8 Hari
P018,Pasien R,Pria,72,Gagal Ginjal Kronis,2024-10-12,Ditolak,-,14630373,0,14630373,RS B,Poli Jantung,Metformin,-
P019,Pasien S,Wanita,25,Demam Berdarah,2024-04-19,Tertunda,-,8295816,0,8295816,RS F,Poli Penyakit Dalam,Metformin,-
P020,Pasien T,Pria,54,Hepatitis,2024-07-25,Tertunda,-,6947115,0,6947115,RS G,Poli Penyakit Dalam,Salbutamol,-
P021,Pasien U,Wanita,36,Infeksi Saluran Pernafasan Akut,2024-05-21,Tertunda,-,2960571,0,2960571,RS B,Poli Penyakit Dalam,"Amlodipine, Metformin",-
P022,Pasien V,Pria,61,Tuberkulosis,2024-01-11,Tertunda,-,1961313,0,1961313,RS D,Poli Penyakit Dalam,Paracetamol,-
P023,Pasien W,Wanita,41,Tuberkulosis,2024-06-25,Ditolak,-,11355101,0,11355101,RS B,Poli Paru,"Metformin, Salbutamol",-
P024,Pasien X,Wanita,38,Demam Berdarah,2024-12-15,Disetujui,2024-12-18,12468954,12468954,0,RS C,Poli Saraf,Salbutamol,2 Hari
P025,Pasien Y,Wanita,74,Asma,2024-09-22,Ditolak,-,2586288,0,2586288,RS A,Poli Saraf,"Aspirin, Amlodipine, Ramipril",-
P026,Pasien Z,Pria,20,Stroke,2024-05-15,Tertunda,-,3166283,0,3166283,RS E,Poli Paru,Salbutamol,-
P027,Pasien A,Pria,76,Tuberkulosis,2024-02-28,Tertunda,-,9626911,0,9626911,RS C,Poli Jantung,"Aspirin, Ramipril, Amlodipine",-
P028,Pasien B,Wanita,76,Demam Berdarah,2024-10-17,Tertunda,-,14924463,0,14924463,RS C,Poli Umum,Salbutamol,-
P029,Pasien C,Pria,76,Asma,2024-05-18,Ditolak,-,9662365,0,9662365,RS F,Poli Umum,Insulin,-
P030,Pasien D,Pria,54,Penyakit Jantung,2024-05-14,Ditolak,-,12079081,0,12079081,RS F,Poli Penyakit Dalam,Insulin,-
P031,Pasien E,Pria,46,Stroke,2024-07-07,Ditolak,-,5741953,0,5741953,RS G,Poli Jantung,Metformin,-
P032,Pasien F,Wanita,32,Stroke,2024-07-05,Tertunda,-,11656919,0,11656919,RS B,Poli Saraf,"Salbutamol, Aspirin, Ramipril",-
P033,Pasien G,Wanita,29,Demam Berdarah,2024-06-24,Tertunda,-,5085864,0,5085864,RS F,Poli Paru,Amlodipine,-
P034,Pasien H,Wanita,77,Tuberkulosis,2024-10-30,Ditolak,-,6865324,0,6865324,RS C,Poli Umum,"Amlodipine, Aspirin, Metformin",-
P035,Pasien I,Pria,45,Penyakit Jantung,2024-01-05,Disetujui,2024-01-14,13392278,13392278,0,RS G,Poli Saraf,"Insulin, Aspirin, Paracetamol",5 Hari
P036,Pasien J,Wanita,52,Stroke,2024-07-01,Disetujui,2024-07-11,12480029,12480029,0,RS E,Poli Paru,"Salbutamol, Ramipril",1 Hari
P037,Pasien K,Wanita,32,Tuberkulosis,2024-09-25,Disetujui,2024-10-05,10998954,10998954,0,RS G,Poli Saraf,"Metformin, Amlodipine",10 Hari
P038,Pasien L,Pria,64,Hipertensi,2024-05-30,Disetujui,2024-06-03,12359170,12359170,0,RS B,Poli Paru,"Insulin, Paracetamol",1 Hari
P039,Pasien M,Wanita,80,Asma,2024-06-07,Tertunda,-,14450933,0,14450933,RS E,Poli Saraf,"Ramipril, Paracetamol",-
P040,Pasien N,Pria,23,Hepatitis,2024-12-21,Tertunda,-,7431698,0,7431698,RS E,Poli Jantung,Ramipril,-
P041,Pasien O,Wanita,65,Infeksi Saluran Pernafasan Akut,2024-01-15,Ditolak,-,12603590,0,12603590,RS F,Poli Umum,Paracetamol,-
P042,Pasien P,Pria,48,Diabetes Melitus,2024-03-04,Disetujui,2024-03-12,2903275,2903275,0,RS D,Poli Saraf,"Insulin, Metformin",5 Hari
P043,Pasien Q,Wanita,47,Hepatitis,2024-08-11,Tertunda,-,2906748,0,2906748,RS E,Poli Saraf,Salbutamol,-
P044,Pasien R,Pria,79,Hepatitis,2024-06-05,Disetujui,2024-06-15,11528340,11528340,0,RS D,Poli Penyakit Dalam,"Ramipril, Paracetamol, Metformin",2 Hari
P045,Pasien S,Pria,35,Hepatitis,2024-09-13,Disetujui,2024-09-17,12241828,12241828,0,RS D,Poli Umum,"Aspirin, Metformin, Salbutamol",5 Hari
P046,Pasien T,Wanita,76,Tuberkulosis,2024-09-11,Ditolak,-,8053454,0,8053454,RS G,Poli Penyakit Dalam,"Salbutamol, Aspirin",-
P047,Pasien U,Wanita,69,Infeksi Saluran Pernafasan Akut,2024-08-03,Ditolak,-,9771059,0,9771059,RS F,Poli Penyakit Dalam,"Amlodipine, Ramipril",-
P048,Pasien V,Wanita,48,Penyakit Jantung,2024-12-04,Tertunda,-,8102578,0,8102578,RS E,Poli Saraf,"Amlodipine, Salbutamol",-
P049,Pasien W,Wanita,55,Penyakit Jantung,2024-06-19,Disetujui,2024-06-27,12050050,12050050,0,RS G,Poli Umum,Amlodipine,2 Hari
P050,Pasien X,Wanita,64,Hepatitis,2024-02-23,Disetujui,2024-03-03,3150614,3150614,0,RS F,Poli Jantung,"Insulin, Metformin",9 Hari
  `;
  const coreMessages = convertToCoreMessages(messages);

  const result = await streamText({
    model: customModel(model),
    system:
      // 'you are a friendly assistant! keep your responses concise and helpful.',
      prompt,
    messages: coreMessages,
    maxSteps: 5,
    tools: {
      getWeather: {
        description: 'Get the current weather at a location',
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async ({ latitude, longitude }) => {
          console.log(z);
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      getPythonScriptResult: {
        description: `
          Execute a Python script and get the result.
          The python script must be print output in string.
          The string output must be in html syntax.
          You can use matplotlib to plot the graph and return with base64 string (no html tag).
          Don't use function and class in the script.
          Don't use indentation in the script.
          The script must be in one line.
          The scrip tmust be end with print() function.
        `,
        parameters: z.object({
          script: z.string(),
        }),
        execute: async ({ script }) => {
          try {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            console.log(
              JSON.stringify({ script: script.replace(/\n/g, '\n') })
            );
            const response = await fetch(
              'https://aiva.technosmart.id/api/run/',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ script: script.replace(/\n/g, '\n') }),
              }
            );

            // Check if the response is ok (status in the range 200-299)
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();

            // Assuming the result is a string; adjust if the structure is different
            return typeof result === 'string' ? result : JSON.stringify(result);
          } catch (error) {
            console.error('Error executing script:', error);
            return 'An error occurred while executing the script.';
          }
        },
      },
      getCreator: {
        description: 'Get the creator of this chat app',
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async () => {
          const creatorData = 'The creator of this chat is Ariephoon';
          return creatorData;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error('Failed to save chat');
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stream-text',
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
