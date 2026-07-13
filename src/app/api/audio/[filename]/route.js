import fs from "fs";
import path from "path";

const types = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".flac": "audio/flac",
};

export async function GET(req, { params }) {
    const filename = params.filename;

    const filePath = path.join(
        process.cwd(),
        "audio-tmp",
        filename
    );

    if (!fs.existsSync(filePath)) {
        return new Response("Not found", { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = types[ext] ||  "application/octet-stream";
    const stream = fs.createReadStream(filePath);

    return new Response(stream, {
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
        },
    });
}

