const fs = require('fs');
const pdfParse = require('pdf-parse-fork');

function render_page(pageData) {
  //check documents https://mozilla.github.io/pdf.js/
  let render_options = {
      //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
      normalizeWhitespace: true,
      //do not attempt to combine same line TextItem's. The default value is `false`.
      disableCombineTextItems: true
  }

  return pageData.getTextContent(render_options)
  .then(function(textContent) {
      let lastY, text = '';
      for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY){
              text += item.str;
          }  
          else{
              text += '\n' + item.str;
          }    
          lastY = item.transform[5];
      }
      return text;
  });
}

const parsePDF = (filePath) => {
    try {
      let options = {
        pagerender: render_page
      }
      const dataBuffer = fs.readFileSync(filePath);  // Read the file into a buffer
      return pdfParse(dataBuffer);
    } catch (error) {
      console.log(error)
      console.error('Error reading PDF:', error);
    }
};

module.exports = parsePDF;