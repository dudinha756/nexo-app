/** Extrai texto e coordenadas do PDF *no navegador*, para interpretar horários. */
import type {PdfWord} from './pdf-layout';

export interface ExtractedPdf { pages:PdfWord[][]; pageCount:number; textCount:number }
export async function extractPdfInBrowser(file:File):Promise<ExtractedPdf>{
 // PDF.js só é carregado quando o usuário escolhe um PDF.
 const pdfjs=await import('pdfjs-dist/build/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
 const data=new Uint8Array(await file.arrayBuffer());
 const loading=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true});
 try{
  const document=await loading.promise;
  if(document.numPages>25)throw new Error(`PDF com ${document.numPages} páginas. Envie no máximo 25 páginas por importação.`);
  const pages:PdfWord[][]=[];let textCount=0;
  for(let p=1;p<=document.numPages;p++){
   const page=await document.getPage(p);const contents=await page.getTextContent();const words:PdfWord[]=[];
   for(const x of contents.items){
    if(!('str' in x)||!x.str.trim())continue;
    words.push({str:x.str,x:x.transform[4],y:x.transform[5],width:x.width});textCount+=x.str.trim().length;
   }
   pages.push(words);
  }
  await document.destroy();
  return {pages,pageCount:pages.length,textCount};
 }finally{await loading.destroy()}
}
