import pytesseract
import cv2
import numpy as np
from PIL import Image
import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import logging
from werkzeug.utils import secure_filename
import docx
from docx.shared import Inches
import PyPDF2
import pdfplumber
import fitz  # PyMuPDF for better PDF handling
from docx2txt import docx2txt
import mammoth
import re
from datetime import datetime
import mimetypes
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000'])

# Configure Tesseract path (adjust based on your installation)
# For Windows:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# For macOS:
# pytesseract.pytesseract.tesseract_cmd = '/usr/local/bin/tesseract'
# For Linux: Usually auto-detected

class DocumentProcessor:
    def __init__(self):
        self.supported_image_formats = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif']
        self.supported_doc_formats = ['.pdf', '.doc', '.docx']
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, file_path, file_type=None):
        """Validate file size and format"""
        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}
        
        file_size = os.path.getsize(file_path)
        if file_size > self.max_file_size:
            return {"success": False, "error": "File size exceeds 10MB limit"}
        
        file_ext = Path(file_path).suffix.lower()
        if file_type == 'image' and file_ext not in self.supported_image_formats:
            return {"success": False, "error": f"Unsupported image format: {file_ext}"}
        elif file_type == 'document' and file_ext not in self.supported_doc_formats:
            return {"success": False, "error": f"Unsupported document format: {file_ext}"}
        
        return {"success": True}

    # OCR Methods
    def preprocess_image(self, image_path):
        """Preprocess image for better OCR results"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                pil_image = Image.open(image_path)
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            _, threshold = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            kernel = np.ones((1, 1), np.uint8)
            processed = cv2.morphologyEx(threshold, cv2.MORPH_CLOSE, kernel)
            processed = cv2.morphologyEx(processed, cv2.MORPH_OPEN, kernel)
            
            return processed
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            try:
                return cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            except Exception:
                return None
    
    def extract_text_from_image(self, image_path, lang='eng', preprocessing=True, custom_config=None):
        """Extract text from image using pytesseract"""
        try:
            validation = self.validate_file(image_path, 'image')
            if not validation["success"]:
                return validation
            
            if preprocessing:
                processed_image = self.preprocess_image(image_path)
                if processed_image is None:
                    return {"success": False, "error": "Failed to preprocess image"}
            else:
                processed_image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
                if processed_image is None:
                    return {"success": False, "error": "Failed to load image"}
            
            if custom_config is None:
                custom_config = r'--oem 3 --psm 6'
            
            extracted_text = pytesseract.image_to_string(processed_image, lang=lang, config=custom_config)
            
            try:
                data = pytesseract.image_to_data(processed_image, lang=lang, config=custom_config, output_type=pytesseract.Output.DICT)
                confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            except Exception as e:
                logger.warning(f"Could not get confidence scores: {str(e)}")
                avg_confidence = 0
            
            text = extracted_text.strip()
            
            return {
                "success": True,
                "text": text,
                "confidence": round(avg_confidence, 2),
                "word_count": len(text.split()) if text else 0,
                "char_count": len(text),
                "language": lang,
                "extraction_type": "ocr"
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            return {"success": False, "error": str(e)}

    # Document Processing Methods
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF using multiple methods for best results"""
        try:
            validation = self.validate_file(pdf_path, 'document')
            if not validation["success"]:
                return validation

            text_content = ""
            page_count = 0
            method_used = "unknown"
            
            # Try PyMuPDF first (best for most PDFs)
            try:
                doc = fitz.open(pdf_path)
                page_count = len(doc)
                text_parts = []
                
                for page_num in range(page_count):
                    page = doc.load_page(page_num)
                    text = page.get_text()
                    if text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
                
                text_content = "\n\n".join(text_parts)
                method_used = "PyMuPDF"
                doc.close()
                
            except Exception as e:
                logger.warning(f"PyMuPDF failed, trying pdfplumber: {str(e)}")
                
                # Fallback to pdfplumber
                try:
                    with pdfplumber.open(pdf_path) as pdf:
                        page_count = len(pdf.pages)
                        text_parts = []
                        
                        for i, page in enumerate(pdf.pages):
                            text = page.extract_text()
                            if text and text.strip():
                                text_parts.append(f"--- Page {i + 1} ---\n{text.strip()}")
                        
                        text_content = "\n\n".join(text_parts)
                        method_used = "pdfplumber"
                        
                except Exception as e2:
                    logger.warning(f"pdfplumber failed, trying PyPDF2: {str(e2)}")
                    
                    # Final fallback to PyPDF2
                    try:
                        with open(pdf_path, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            page_count = len(pdf_reader.pages)
                            text_parts = []
                            
                            for i, page in enumerate(pdf_reader.pages):
                                text = page.extract_text()
                                if text and text.strip():
                                    text_parts.append(f"--- Page {i + 1} ---\n{text.strip()}")
                            
                            text_content = "\n\n".join(text_parts)
                            method_used = "PyPDF2"
                            
                    except Exception as e3:
                        return {"success": False, "error": f"All PDF extraction methods failed: {str(e3)}"}
            
            # Clean up the text
            text_content = self.clean_extracted_text(text_content)
            
            return {
                "success": True,
                "text": text_content,
                "word_count": len(text_content.split()) if text_content else 0,
                "char_count": len(text_content),
                "page_count": page_count,
                "extraction_method": method_used,
                "extraction_type": "pdf"
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def extract_text_from_docx(self, docx_path):
        """Extract text from DOCX using multiple methods"""
        try:
            validation = self.validate_file(docx_path, 'document')
            if not validation["success"]:
                return validation

            text_content = ""
            method_used = "unknown"
            
            # Try mammoth first (better formatting preservation)
            try:
                with open(docx_path, "rb") as docx_file:
                    result = mammoth.extract_raw_text(docx_file)
                    text_content = result.value
                    method_used = "mammoth"
                    
            except Exception as e:
                logger.warning(f"Mammoth failed, trying docx2txt: {str(e)}")
                
                # Fallback to docx2txt
                try:
                    text_content = docx2txt.process(docx_path)
                    method_used = "docx2txt"
                    
                except Exception as e2:
                    logger.warning(f"docx2txt failed, trying python-docx: {str(e2)}")
                    
                    # Final fallback to python-docx
                    try:
                        doc = docx.Document(docx_path)
                        paragraphs = []
                        for paragraph in doc.paragraphs:
                            if paragraph.text.strip():
                                paragraphs.append(paragraph.text.strip())
                        text_content = "\n\n".join(paragraphs)
                        method_used = "python-docx"
                        
                    except Exception as e3:
                        return {"success": False, "error": f"All DOCX extraction methods failed: {str(e3)}"}
            
            # Clean up the text
            text_content = self.clean_extracted_text(text_content)
            
            return {
                "success": True,
                "text": text_content,
                "word_count": len(text_content.split()) if text_content else 0,
                "char_count": len(text_content),
                "extraction_method": method_used,
                "extraction_type": "docx"
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def extract_text_from_doc(self, doc_path):
        """Extract text from DOC (legacy Word format)"""
        try:
            validation = self.validate_file(doc_path, 'document')
            if not validation["success"]:
                return validation

            # Try using docx2txt which can handle .doc files
            try:
                text_content = docx2txt.process(doc_path)
                text_content = self.clean_extracted_text(text_content)
                
                return {
                    "success": True,
                    "text": text_content,
                    "word_count": len(text_content.split()) if text_content else 0,
                    "char_count": len(text_content),
                    "extraction_method": "docx2txt",
                    "extraction_type": "doc"
                }
                
            except Exception as e:
                return {
                    "success": False, 
                    "error": f"DOC extraction failed. Consider converting to DOCX format first: {str(e)}"
                }
                
        except Exception as e:
            logger.error(f"Error extracting text from DOC: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def clean_extracted_text(self, text):
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Multiple newlines to double
        text = re.sub(r' +', ' ', text)  # Multiple spaces to single
        text = text.strip()
        
        return text
    
    def analyze_document(self, file_path):
        """Main method to analyze any supported document type"""
        try:
            if not os.path.exists(file_path):
                return {"success": False, "error": "File not found"}
            
            file_ext = Path(file_path).suffix.lower()
            file_size = os.path.getsize(file_path)
            
            # Determine file type and extract accordingly
            if file_ext in self.supported_image_formats:
                result = self.extract_text_from_image(file_path)
            elif file_ext == '.pdf':
                result = self.extract_text_from_pdf(file_path)
            elif file_ext == '.docx':
                result = self.extract_text_from_docx(file_path)
            elif file_ext == '.doc':
                result = self.extract_text_from_doc(file_path)
            else:
                return {"success": False, "error": f"Unsupported file format: {file_ext}"}
            
            if result["success"]:
                # Add common metadata
                result.update({
                    "file_extension": file_ext,
                    "file_size_bytes": file_size,
                    "file_size_formatted": self.format_file_size(file_size),
                    "processed_at": datetime.now().isoformat()
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing document: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def format_file_size(self, size_bytes):
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 Bytes"
        
        size_names = ["Bytes", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024
            i += 1
        
        return f"{size_bytes:.2f} {size_names[i]}"

# Initialize processors
document_processor = DocumentProcessor()

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test tesseract for OCR
        ocr_available = True
        tesseract_version = None
        try:
            tesseract_version = str(pytesseract.get_tesseract_version())
        except Exception:
            ocr_available = False
        
        return jsonify({
            "status": "healthy",
            "service": "Combined Document Analysis Service",
            "features": {
                "ocr": ocr_available,
                "pdf_analysis": True,
                "docx_analysis": True,
                "doc_analysis": True
            },
            "tesseract_version": tesseract_version,
            "supported_formats": {
                "images": document_processor.supported_image_formats,
                "documents": document_processor.supported_doc_formats
            }
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "Combined Document Analysis Service",
            "error": str(e)
        }), 500

# OCR Endpoints (maintain compatibility with existing frontend)
@app.route('/ocr/extract', methods=['POST'])
def extract_text_from_upload():
    """Extract text from uploaded image"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        filename = secure_filename(file.filename)
        lang = request.form.get('language', 'eng')
        preprocessing = request.form.get('preprocessing', 'true').lower() == 'true'
        
        file_ext = os.path.splitext(filename)[1] if filename else '.tmp'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            try:
                file.save(temp_file.name)
                result = document_processor.extract_text_from_image(
                    temp_file.name, lang=lang, preprocessing=preprocessing
                )
                return jsonify(result)
            finally:
                try:
                    os.unlink(temp_file.name)
                except OSError:
                    pass
    
    except Exception as e:
        logger.error(f"Error in extract_text_from_upload: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ocr/extract_from_path', methods=['POST'])
def extract_text_from_path():
    """Extract text from file path"""
    try:
        data = request.get_json()
        
        if not data or 'file_path' not in data:
            return jsonify({"success": False, "error": "file_path is required"}), 400
        
        file_path = data['file_path']
        lang = data.get('language', 'eng')
        preprocessing = data.get('preprocessing', True)
        
        result = document_processor.extract_text_from_image(
            file_path, lang=lang, preprocessing=preprocessing
        )
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in extract_text_from_path: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ocr/languages', methods=['GET'])
def get_supported_languages():
    """Get supported OCR languages"""
    try:
        languages = pytesseract.get_languages()
        return jsonify({
            "success": True,
            "languages": languages,
            "default": "eng"
        })
    except Exception as e:
        logger.error(f"Error getting languages: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "languages": ["eng"],
            "default": "eng"
        })

# New Document Analysis Endpoints
@app.route('/document/analyze', methods=['POST'])
def analyze_uploaded_document():
    """Analyze uploaded document (PDF, DOC, DOCX, or image)"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1] if filename else '.tmp'
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            try:
                file.save(temp_file.name)
                result = document_processor.analyze_document(temp_file.name)
                if result["success"]:
                    result["filename"] = filename
                return jsonify(result)
            finally:
                try:
                    os.unlink(temp_file.name)
                except OSError:
                    pass
    
    except Exception as e:
        logger.error(f"Error in analyze_uploaded_document: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/document/analyze_from_path', methods=['POST'])
def analyze_document_from_path():
    """Analyze document from file path"""
    try:
        data = request.get_json()
        
        if not data or 'file_path' not in data:
            return jsonify({"success": False, "error": "file_path is required"}), 400
        
        file_path = data['file_path']
        result = document_processor.analyze_document(file_path)
        
        if result["success"]:
            result["filename"] = os.path.basename(file_path)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in analyze_document_from_path: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/document/supported_formats', methods=['GET'])
def get_supported_formats():
    """Get supported document formats"""
    return jsonify({
        "success": True,
        "formats": {
            "images": document_processor.supported_image_formats,
            "documents": document_processor.supported_doc_formats,
            "all": document_processor.supported_image_formats + document_processor.supported_doc_formats
        }
    })

# Error handlers
@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"success": False, "error": "File too large (max 10MB)"}), 413

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({"success": False, "error": "Internal server error"}), 500

if __name__ == '__main__':
    # Test dependencies
    missing_deps = []
    
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
    except Exception as e:
        missing_deps.append("Tesseract OCR")
        logger.warning(f"Tesseract OCR not available: {str(e)}")
    
    try:
        import docx
        import docx2txt
        import mammoth
    except ImportError as e:
        missing_deps.append("Document processing libraries")
        logger.warning(f"Document libraries not available: {str(e)}")
    
    try:
        import fitz
    except ImportError:
        logger.warning("PyMuPDF not available, falling back to other PDF methods")
    
    try:
        import pdfplumber
    except ImportError:
        logger.warning("pdfplumber not available, falling back to PyPDF2")
    
    if missing_deps:
        logger.warning(f"Some features may not work due to missing dependencies: {', '.join(missing_deps)}")
    
    logger.info("Starting Combined Document Analysis Service on port 5001...")
    logger.info("Available endpoints:")
    logger.info("  OCR: /ocr/extract, /ocr/extract_from_path, /ocr/languages")
    logger.info("  Document Analysis: /document/analyze, /document/analyze_from_path")
    logger.info("  Utilities: /health, /document/supported_formats")
    
    app.run(host='0.0.0.0', port=5001, debug=True)