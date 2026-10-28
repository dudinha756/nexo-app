import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%",background:"linear-gradient(145deg,#fff8f8,#f5e9f4)",borderRadius:35}}>
      <svg width="160" height="160" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eca3b8"/><stop offset="0.52" stopColor="#d694c1"/><stop offset="1" stopColor="#725cac"/></linearGradient>
          <linearGradient id="spark" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d595bd"/><stop offset="1" stopColor="#725aac"/></linearGradient>
        </defs>
        <path d="M146 364 C146 277 140 218 149 203 C158 178 186 171 207 186 C253 218 290 323 335 358 C352 373 373 373 386 358 C405 333 391 288 377 254" fill="none" stroke="url(#n)" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M377 125 Q384 164 405 172 Q384 181 377 216 Q371 181 350 172 Q370 163 377 125 Z" fill="url(#spark)"/>
        <path d="M425 237 Q428 251 437 255 Q428 260 425 273 Q421 260 413 255 Q422 251 425 237 Z" fill="#dfb0c9"/>
      </svg>
    </div>,
    { ...size }
  );
}
