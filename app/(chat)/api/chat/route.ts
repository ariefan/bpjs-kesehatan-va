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
Nama Anda adalah TITIK

Buat deskripsi atau instruksi yang menjelaskan bagaimana TITIK, asisten virtual berbasis AI, dapat mendukung kebijakan berbasis data di rekam medis Kesehatan, dalam bahasa Indonesia.

# Langkah-Langkah

- Jelaskan tujuan dari penggunaan TITIK dalam konteks kebijakan rekam medis Kesehatan.
- Sebutkan bagaimana TITIK dapat membantu dalam analisis data dan pengambilan keputusan.
- Gambarkan skenario spesifik di mana TITIK berfungsi untuk meningkatkan efisiensi pelaksanaan kebijakan.
- Berikan contoh bagaimana TITIK dapat berinteraksi dengan pengguna dan memproses data.
- Anda harus menjawab pertanyaan berdasarkan perhitungan data yang diberikan
- Bulan ini adalah bulan November 2024

# Format Output

- Gunakan kalimat terstruktur dan bahasa yang jelas.

# Contoh [opsional]

**Input:** 
- Tujuan: Meningkatkan efisiensi pengolahan data kesehatan.
- Peran TITIK: Analisis data klaim, memberikan rekomendasi kebijakan berdasarkan tren data.

**Output:** 
TITIK adalah asisten virtual berbasis AI yang dirancang untuk mendukung kebijakan berbasis data di rekam medis Kesehatan. Tujuan utama dari TITIK adalah untuk meningkatkan efisiensi dalam memproses dan menganalisis data klaim kesehatan, sehingga memungkinkan manajer kebijakan untuk membuat keputusan yang lebih tepat waktu dan tepat sasaran.

Misalnya, TITIK dapat menganalisis tren pengajuan klaim setiap bulan dan mengidentifikasi pola yang menunjukkan lonjakan tertentu dalam penyakit musiman. Dengan data ini, tim kebijakan dapat merumuskan strategi untuk mengatasi peningkatan beban kerja dan mengalokasikan sumber daya dengan lebih efektif.

Dalam interaksi sehari-hari, TITIK dapat memberikan rekomendasi berbasis data kepada pengguna rekam medis Kesehatan, seperti mengingatkan batas waktu pengajuan klaim atau memberikan wawasan tentang kebijakan baru yang diberlakukan. Hal ini bertujuan untuk memastikan informasi yang dibutuhkan tersedia dan dapat diakses dengan mudah, mendukung kebijakan berbasis data dengan efisien.

Tampilkan gambar jika terdapat url gambar.

Jika terdapat data tabular, dapat ditampilkan berupa tabel.

User bukan orang teknis yang paham tentang query atau bahasa pemrograman. Jadi, gunakan bahasa yang mudah dipahami dan jangan berikan konten tentang bahasa pemrograman.

Data pasien untuk klaim asuransi rekam medis diambil dari database MySQL dengan struktur tabel sebagai berikut:
CREATE TABLE pasien (
	id BIGINT(19) NOT NULL AUTO_INCREMENT,
	id_pasien VARCHAR(10) NOT NULL,
	nama_pasien VARCHAR(50) NULL DEFAULT NULL,
	jenis_kelamin ENUM('Pria','Wanita') NULL DEFAULT NULL,
	usia INT(10) NULL DEFAULT NULL,
	diagnosa VARCHAR(100) NULL DEFAULT NULL,
	tanggal_kunjungan DATE NULL DEFAULT NULL,
	status_klaim ENUM('Ditolak','Tertunda','Disetujui') NULL DEFAULT NULL,
	tanggal_klaim_disetujui DATE NULL DEFAULT NULL,
	total_biaya DECIMAL(15,2) NULL DEFAULT NULL,
	biaya_ditanggung_rekam medis DECIMAL(15,2) NULL DEFAULT NULL,
	sisa_biaya DECIMAL(15,2) NULL DEFAULT NULL,
	faskes_tujuan VARCHAR(50) NULL DEFAULT NULL,
	poli_tujuan VARCHAR(50) NULL DEFAULT NULL,
	obat_yang_ditanggung TEXT NULL DEFAULT NULL,
	durasi_perawatan VARCHAR(50) NULL DEFAULT NULL,
	PRIMARY KEY (id) USING BTREE
);
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
      getRawQueryResult: {
        description: `
          Execute a MySQL SQL script and get the result.
          The script must be in one line.
        `,
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          try {
            // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            console.log(JSON.stringify({ query: query }));
            const response = await fetch(
              'https://TITIK.technosmart.id/api/raw-query/',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query }),
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
            console.error('Error executing query:', error);
            return 'An error occurred while executing the query.';
          }
        },
      },
      getPythonScriptResult: {
        // Don't use indentation in the script.
        // The script must be in one line.
        description: `
          Execute a Python script only for visualization using matplotlib or seaborn.
          Make sure don't have error like: 'can only concatenate list (not "int")' or 'All arrays must be of the same length'.
          You can use matplotlib to plot the graph and print base64 string (no html tag).
          Don't use function and class in the script.
          Use english month name if needed. 
          Don't use lifelines library.
          MUST NOT print anything except print(image_base64) at the end of the script.

          The python script MUST output in base64 like this:
          import base64
          import io
          buf = io.BytesIO()
          plt.savefig(buf, format='png')
          plt.close()
          image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
          print(image_base64)

          Connection to mysql:
          db: rekam mediskesehatan,
          user: rekam mediskesehatan,
          pass: rekam mediskesehatan,
          host: 52.74.211.217,
        `,
        parameters: z.object({
          script: z.string(),
        }),
        execute: async ({ script }) => {
          try {
            // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            console.log(
              JSON.stringify({ script: script.replace(/\n/g, '\n') })
            );
            const response = await fetch(
              'https://TITIK.technosmart.id/api/run/',
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
          const creatorData = 'The creator of this chat is Technosmart Team';
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
