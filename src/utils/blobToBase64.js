
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
	    //resolve(reader.result);
	    const dataUrl = reader.result;
	    // strip prefix
	    const base64 = dataUrl.split(",")[1];
	    resolve (base64);
	};
        reader.onerror = reject;

        reader.readAsDataURL(blob);
    });
}
