export class TextDecoder {
	constructor(utfLabel, options) {
		if (!["unicode-1-1-utf-8", "utf-8", "utf8"].includes(utfLabel)) {
			throw new Error(`Unsupported encoding ${utfLabel}`);
		}
	}

	decode(bytes) {
		/* Copyright 2017 Sam Thorogood. See https://github.com/samthor/fast-text-encoding/blob/master/text.js */
		let inputIndex = 0;

		// Create a working buffer for UTF-16 code points, but don't generate one
		// which is too large for small input sizes. UTF-8 to UCS-16 conversion is
		// going to be at most 1:1, if all code points are ASCII. The other extreme
		// is 4-byte UTF-8, which results in two UCS-16 points, but this is still 50%
		// fewer entries in the output.
		const pendingSize = Math.min(256 * 256, bytes.length + 1);
		const pending = new Uint16Array(pendingSize);
		const chunks = [];
		let pendingIndex = 0;

		for (; ;) {
			const more = inputIndex < bytes.length;

			if (!more || (pendingIndex >= pendingSize - 1)) {
				chunks.push(String.fromCharCode.apply(null, pending.subarray(0, pendingIndex)));

				if (!more) {
					return chunks.join('');
				}

				bytes = bytes.subarray(inputIndex);
				inputIndex = 0;
				pendingIndex = 0;
			}

			const byte1 = bytes[inputIndex++];
			if ((byte1 & 0x80) === 0) {
				pending[pendingIndex++] = byte1;
			} else if ((byte1 & 0xe0) === 0xc0) {
				const byte2 = bytes[inputIndex++] & 0x3f;
				pending[pendingIndex++] = ((byte1 & 0x1f) << 6) | byte2;
			} else if ((byte1 & 0xf0) === 0xe0) {  // 3-byte
				const byte2 = bytes[inputIndex++] & 0x3f;
				const byte3 = bytes[inputIndex++] & 0x3f;
				pending[pendingIndex++] = ((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3;
			} else if ((byte1 & 0xf8) === 0xf0) {
				const byte2 = bytes[inputIndex++] & 0x3f;
				const byte3 = bytes[inputIndex++] & 0x3f;
				const byte4 = bytes[inputIndex++] & 0x3f;

				let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
				if (codepoint > 0xffff) {
					codepoint -= 0x10000;
					pending[pendingIndex++] = (codepoint >>> 10) & 0x3ff | 0xd800;
					codepoint = 0xdc00 | codepoint & 0x3ff;
				}
				pending[pendingIndex++] = codepoint;
			} else {
			}
		}
	}
}

export const TextEncoder = function TextEncoder() { };

// From MDN
TextEncoder.prototype.encode = function encode(str) {
	"use strict";
	var Len = str.length, resPos = -1;
	// The Uint8Array's length must be at least 3x the length of the string because an invalid UTF-16
	//  takes up the equivelent space of 3 UTF-8 characters to encode it properly. However, Array's
	//  have an auto expanding length and 1.5x should be just the right balance for most uses.
	var resArr = typeof Uint8Array === "undefined" ? new Array(Len * 1.5) : new Uint8Array(Len * 3);
	for (var point = 0, nextcode = 0, i = 0; i !== Len;) {
		point = str.charCodeAt(i), i += 1;
		if (point >= 0xD800 && point <= 0xDBFF) {
			if (i === Len) {
				resArr[resPos += 1] = 0xef/*0b11101111*/; resArr[resPos += 1] = 0xbf/*0b10111111*/;
				resArr[resPos += 1] = 0xbd/*0b10111101*/; break;
			}
			// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
			nextcode = str.charCodeAt(i);
			if (nextcode >= 0xDC00 && nextcode <= 0xDFFF) {
				point = (point - 0xD800) * 0x400 + nextcode - 0xDC00 + 0x10000;
				i += 1;
				if (point > 0xffff) {
					resArr[resPos += 1] = (0x1e/*0b11110*/ << 3) | (point >>> 18);
					resArr[resPos += 1] = (0x2/*0b10*/ << 6) | ((point >>> 12) & 0x3f/*0b00111111*/);
					resArr[resPos += 1] = (0x2/*0b10*/ << 6) | ((point >>> 6) & 0x3f/*0b00111111*/);
					resArr[resPos += 1] = (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/);
					continue;
				}
			} else {
				resArr[resPos += 1] = 0xef/*0b11101111*/; resArr[resPos += 1] = 0xbf/*0b10111111*/;
				resArr[resPos += 1] = 0xbd/*0b10111101*/; continue;
			}
		}
		if (point <= 0x007f) {
			resArr[resPos += 1] = (0x0/*0b0*/ << 7) | point;
		} else if (point <= 0x07ff) {
			resArr[resPos += 1] = (0x6/*0b110*/ << 5) | (point >>> 6);
			resArr[resPos += 1] = (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/);
		} else {
			resArr[resPos += 1] = (0xe/*0b1110*/ << 4) | (point >>> 12);
			resArr[resPos += 1] = (0x2/*0b10*/ << 6) | ((point >>> 6) & 0x3f/*0b00111111*/);
			resArr[resPos += 1] = (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/);
		}
	}
	return resArr.subarray(0, resPos + 1);
};

TextEncoder.prototype.toString = function () { return "[object TextEncoder]" };
Object.defineProperty(TextEncoder.prototype, "encoding", {
	get: function () {
		if (TextEncoder.prototype.isPrototypeOf(this)) return "utf-8";
		else throw TypeError("Illegal invocation");
	}
});
