import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
import {parseCSV} from '../../catalogue.js';
const dir=new URL('./',import.meta.url);
const rows=parseCSV(await fs.readFile(new URL('products-clean.csv',dir),'utf8'));
const headers=Object.keys(rows[0]);
const wb=Workbook.create();const sheet=wb.worksheets.add('Products');
const data=[headers,...rows.map(p=>headers.map(k=>['stock_qty','source_row'].includes(k)&&p[k]!==''?Number(p[k]):['published','featured'].includes(k)?String(p[k]).toLowerCase()==='true':p[k]))];
sheet.getRange(`A1:Q${data.length}`).values=data;
sheet.showGridLines=false;sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(2);
sheet.getRange(`A1:Q${data.length}`).format.font={name:'Arial',size:10,color:'#18333F'};
sheet.getRange(`A1:Q${data.length}`).format.rowHeight=24;
sheet.getRange(`A1:Q${data.length}`).format.columnWidth=19;
sheet.getRange('A1:Q1').format={fill:'#142D38',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:30};
sheet.getRange('B1:B702').format.columnWidth=70;
sheet.getRange('G1:G702').format.columnWidth=65;
sheet.getRange('C1:F702').format.columnWidth=27;
sheet.getRange('Q1:Q702').format.columnWidth=95;
sheet.getRange('H2:H702').setNumberFormat('#,##0.00');
sheet.getRange('P2:P702').setNumberFormat('0');
sheet.tables.add(`A1:Q${data.length}`,true,'ProductsCatalogue');
for(const col of ['B','G','Q'])sheet.getRange(`${col}2:${col}${data.length}`).format.wrapText=true;
sheet.getRange(`A2:Q${data.length}`).format.autofitRows();
sheet.getRange('M2:M702').dataValidation={rule:{type:'list',values:['TRUE','FALSE']}};
const guide=wb.worksheets.add('Read me');guide.showGridLines=false;
const notes=[
 ['Catalogue maintenance','Instructions'],
 ['Source','Copy of STOCK UPDATE.xlsx; original workbook remains unchanged.'],
 ['Import','Upload this workbook to Google Sheets. Publish only Products as CSV.'],
 ['Records','701 products; 689 published; 244 records have review notes.'],
 ['Review first','Filter review_notes for nonblank entries. Confirm missing details and repeated model variants.'],
 ['Publish','TRUE shows the row on the website. FALSE hides it. Keep the header row intact.'],
 ['Identifiers','Keep id unique and stable. Keep model as plain text. Do not merge rows on model alone.'],
 ['Prices','Excluded entirely. Never add sales prices, purchase costs or margins to this public catalogue.'],
 ['Availability','stock_qty is historical source balance. Confirm availability is shown initially.'],
 ['Missing values','Blank means unknown, not zero. No prices or model codes inferred from neighbouring rows.'],
 ['Units','piece is the default; pipe products use roll. Verify packaging and unit before publishing.'],
 ['Images','Real sourced images only. Family images may differ by variant. Blank uses a matched local photo or request-photo text.'],
 ['Privacy','No costs/margins included. Published CSV exposes all its columns, even fields not shown by the UI.'],
 ['Provenance','source_sheet and source_row trace each record. See cleaning-report.json for omitted structural/orphan rows.'],
 ['Dates','updated_at is the source sales update date, if present, not a current stock confirmation.'],
 ['Setup','See repository README.md for Google Sheets and GitHub Pages setup.'],
];
guide.getRange('A1:B16').values=notes;
guide.getRange('A1:B16').format.font={name:'Arial',size:11,color:'#18333F'};
guide.getRange('A1:A16').format.columnWidth=24;
guide.getRange('B1:B16').format.columnWidth=100;
guide.getRange('A1:B16').format.rowHeight=39;
guide.getRange('B1:B16').format.wrapText=true;
guide.getRange('A1:B1').format={fill:'#142D38',font:{bold:true,color:'#FFFFFF'}};
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Products!A1:I4',include:'values',tableMaxRows:4,tableMaxCols:9,maxChars:2000})).ndjson);
for(const [name,range,file] of [['Products','A1:D12','products-preview.png'],['Read me','A1:B16','guide-preview.png']]){
 const png=await wb.render({sheetName:name,range,scale:1.3,format:'png'});
 await fs.writeFile(new URL(file,dir),new Uint8Array(await png.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(new URL('products-clean.xlsx',dir).pathname.replace(/^\/([A-Z]:)/,'$1'));
console.log('Exported products-clean.xlsx');
