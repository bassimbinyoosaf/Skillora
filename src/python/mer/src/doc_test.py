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
from collections import Counter

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

class KeywordExtractor:
    def __init__(self):
        # Technical skills patterns
        self.programming_languages = [
            r'\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|R|MATLAB|Perl|Dart|Elixir|Haskell)\b',
            r'\b(?:HTML|CSS|SQL|NoSQL|GraphQL|XML|JSON|YAML)\b',
            r'\b(?:React(?:\.js)?|Angular(?:\.js)?|Vue(?:\.js)?|Svelte|Next\.js|Nuxt\.js|Gatsby)\b',
            r'\b(?:Node\.js|Express\.js|Django|Flask|Laravel|Spring|ASP\.NET|Rails)\b'
        ]
        
        # Frameworks and libraries
        self.frameworks_libraries = [
            r'\b(?:TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy|OpenCV|Keras|NLTK|SpaCy)\b',
            r'\b(?:Bootstrap|Tailwind|Material-UI|Ant Design|Chakra UI|Bulma)\b',
            r'\b(?:jQuery|Lodash|Axios|D3\.js|Three\.js|Chart\.js|Moment\.js)\b',
            r'\b(?:Redux|MobX|Vuex|Pinia|Context API|Zustand)\b'
        ]
        
        # Databases and tools
        self.databases_tools = [
            r'\b(?:MongoDB|MySQL|PostgreSQL|SQLite|Redis|Elasticsearch|DynamoDB|Firebase|Supabase)\b',
            r'\b(?:Docker|Kubernetes|Jenkins|GitHub Actions|GitLab CI|Travis CI|CircleCI)\b',
            r'\b(?:AWS|Azure|Google Cloud|GCP|Heroku|Vercel|Netlify|DigitalOcean)\b',
            r'\b(?:Git|SVN|Mercurial|Bitbucket|GitHub|GitLab)\b'
        ]
        
        # Certifications patterns
        self.certifications = [
            r'\b(?:AWS|Amazon Web Services)\s+(?:Certified\s+)?(?:Solutions Architect|Developer|SysOps|Cloud Practitioner|DevOps Engineer|Security|Machine Learning|Data Analytics)\b',
            r'\b(?:Microsoft|Azure)\s+(?:Certified\s+)?(?:Azure Administrator|Azure Developer|Azure Architect|Azure DevOps|Azure Security|Azure Data|Azure AI)\b',
            r'\b(?:Google Cloud|GCP)\s+(?:Certified\s+)?(?:Associate Cloud Engineer|Professional Cloud Architect|Professional Data Engineer|Professional Machine Learning)\b',
            r'\b(?:Cisco)\s+(?:Certified\s+)?(?:CCNA|CCNP|CCIE|CCDA|CCDP|CCSP)\b',
            r'\b(?:Oracle)\s+(?:Certified\s+)?(?:Associate|Professional|Master|Expert)\b',
            r'\b(?:CompTIA)\s+(?:A\+|Network\+|Security\+|Cloud\+|Linux\+|Project\+|Server\+)\b',
            r'\b(?:Scrum Master|Product Owner|CSM|CSPO|PSM|PSPO|SAFe|Agile)\s+(?:Certified|Certification)?\b',
            r'\b(?:PMP|Project Management Professional|CAPM|Prince2|Six Sigma|Lean)\b',
            r'\b(?:React|Angular|Vue|Python|Java|JavaScript|TypeScript|AWS|Azure|Docker|Kubernetes)\s+(?:Certified|Certification|Certificate)\b'
        ]
        
        # Educational qualifications
        self.education_patterns = [
            r'\b(?:Bachelor|Master|PhD|Doctorate|Associate)\s+(?:of\s+)?(?:Science|Arts|Engineering|Technology|Computer Science|Information Technology|Business|Management)\b',
            r'\b(?:B\.Tech|M\.Tech|B\.E\.|M\.E\.|B\.S\.|M\.S\.|B\.A\.|M\.A\.|MBA|MCA|BCA)\b',
            r'\b(?:Computer Science|Information Technology|Software Engineering|Data Science|Machine Learning|Artificial Intelligence)\b'
        ]
        
        # Soft skills and methodologies
        self.methodologies = [
            r'\b(?:Agile|Scrum|Kanban|DevOps|CI/CD|TDD|BDD|Microservices|RESTful|GraphQL)\b',
            r'\b(?:Machine Learning|Deep Learning|Data Science|Big Data|Analytics|Statistics|NLP|Computer Vision)\b',
            r'\b(?:UI/UX|User Experience|User Interface|Design Thinking|Figma|Sketch|Adobe|Photoshop)\b'
        ]
        
        # Company names (for work experience)
        self.companies = [
            r'\b(?:Google|Microsoft|Apple|Amazon|Meta|Facebook|Netflix|Tesla|Uber|Airbnb|Spotify)\b',
            r'\b(?:IBM|Oracle|SAP|Salesforce|Adobe|Intel|NVIDIA|Qualcomm|Cisco|VMware)\b',
            r'\b(?:TCS|Infosys|Wipro|HCL|Cognizant|Accenture|Capgemini|Deloitte|PwC|EY)\b'
        ]
        
        # Combine all patterns
        self.all_patterns = {
            'programming_languages': self.programming_languages,
            'frameworks_libraries': self.frameworks_libraries,
            'databases_tools': self.databases_tools,
            'certifications': self.certifications,
            'education': self.education_patterns,
            'methodologies': self.methodologies,
            'companies': self.companies
        }

    def extract_keywords(self, text, min_confidence=0.7):
        """Extract keywords from text using regex patterns"""
        if not text or not isinstance(text, str):
            return {
                "success": False,
                "error": "Invalid or empty text provided"
            }
        
        # Clean text for better matching
        cleaned_text = self.clean_text_for_extraction(text)
        
        found_keywords = {}
        all_matches = []
        
        for category, patterns in self.all_patterns.items():
            category_matches = []
            
            for pattern in patterns:
                matches = re.finditer(pattern, cleaned_text, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    keyword = match.group().strip()
                    # Store match with context
                    start = max(0, match.start() - 50)
                    end = min(len(cleaned_text), match.end() + 50)
                    context = cleaned_text[start:end].strip()
                    
                    match_info = {
                        'keyword': keyword,
                        'category': category,
                        'context': context,
                        'position': match.start(),
                        'confidence': self.calculate_confidence(keyword, context, category)
                    }
                    
                    if match_info['confidence'] >= min_confidence:
                        category_matches.append(match_info)
                        all_matches.append(match_info)
            
            if category_matches:
                found_keywords[category] = category_matches
        
        # Get top keywords by frequency and confidence
        keyword_counts = Counter([m['keyword'].lower() for m in all_matches])
        top_keywords = self.get_top_keywords(all_matches, keyword_counts)
        
        return {
            "success": True,
            "keywords_by_category": found_keywords,
            "top_keywords": top_keywords,
            "total_keywords_found": len(all_matches),
            "unique_keywords": len(set([m['keyword'].lower() for m in all_matches])),
            "categories_found": list(found_keywords.keys())
        }
    
    def clean_text_for_extraction(self, text):
        """Clean text for better keyword extraction"""
        # Remove excessive whitespace and normalize
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters that might interfere with matching
        text = re.sub(r'[^\w\s\.\+\#\-/]', ' ', text)
        return text.strip()
    
    def calculate_confidence(self, keyword, context, category):
        """Calculate confidence score for a keyword match"""
        confidence = 0.8  # Base confidence
        
        # Context-based confidence adjustments
        context_lower = context.lower()
        keyword_lower = keyword.lower()
        
        # Higher confidence for certain contexts
        if any(word in context_lower for word in ['certified', 'certification', 'certificate', 'diploma', 'degree']):
            confidence += 0.15
            
        if any(word in context_lower for word in ['experience', 'skilled', 'proficient', 'expert', 'years']):
            confidence += 0.1
            
        if any(word in context_lower for word in ['project', 'developed', 'built', 'created', 'implemented']):
            confidence += 0.05
            
        # Category-specific adjustments
        if category == 'certifications' and any(word in context_lower for word in ['aws', 'microsoft', 'google', 'oracle']):
            confidence += 0.1
            
        return min(confidence, 1.0)
    
    def get_top_keywords(self, all_matches, keyword_counts, limit=10):
        """Get top keywords sorted by frequency and confidence"""
        # Calculate weighted scores
        keyword_scores = {}
        for match in all_matches:
            keyword_lower = match['keyword'].lower()
            frequency = keyword_counts[keyword_lower]
            confidence = match['confidence']
            
            # Weighted score combining frequency and confidence
            score = frequency * 0.6 + confidence * 0.4
            
            if keyword_lower not in keyword_scores or score > keyword_scores[keyword_lower]['score']:
                keyword_scores[keyword_lower] = {
                    'keyword': match['keyword'],
                    'category': match['category'],
                    'frequency': frequency,
                    'confidence': confidence,
                    'score': score
                }
        
        # Sort by score and return top keywords
        sorted_keywords = sorted(keyword_scores.values(), key=lambda x: x['score'], reverse=True)
        return sorted_keywords[:limit]

class DocumentProcessor:
    def __init__(self):
        self.supported_image_formats = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif']
        self.supported_doc_formats = ['.pdf', '.doc', '.docx']
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.keyword_extractor = KeywordExtractor()
    
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
    
    def extract_text_from_image(self, image_path, lang='eng', preprocessing=True, custom_config=None, extract_keywords=True):
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
            
            result = {
                "success": True,
                "text": text,
                "confidence": round(avg_confidence, 2),
                "word_count": len(text.split()) if text else 0,
                "char_count": len(text),
                "language": lang,
                "extraction_type": "ocr"
            }
            
            # Extract keywords if requested and text is available
            if extract_keywords and text:
                keyword_result = self.keyword_extractor.extract_keywords(text)
                if keyword_result["success"]:
                    result["keywords"] = keyword_result
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            return {"success": False, "error": str(e)}

    # Document Processing Methods
    def extract_text_from_pdf(self, pdf_path, extract_keywords=True):
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
            
            result = {
                "success": True,
                "text": text_content,
                "word_count": len(text_content.split()) if text_content else 0,
                "char_count": len(text_content),
                "page_count": page_count,
                "extraction_method": method_used,
                "extraction_type": "pdf"
            }
            
            # Extract keywords if requested and text is available
            if extract_keywords and text_content:
                keyword_result = self.keyword_extractor.extract_keywords(text_content)
                if keyword_result["success"]:
                    result["keywords"] = keyword_result
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def extract_text_from_docx(self, docx_path, extract_keywords=True):
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
            
            result = {
                "success": True,
                "text": text_content,
                "word_count": len(text_content.split()) if text_content else 0,
                "char_count": len(text_content),
                "extraction_method": method_used,
                "extraction_type": "docx"
            }
            
            # Extract keywords if requested and text is available
            if extract_keywords and text_content:
                keyword_result = self.keyword_extractor.extract_keywords(text_content)
                if keyword_result["success"]:
                    result["keywords"] = keyword_result
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def extract_text_from_doc(self, doc_path, extract_keywords=True):
        """Extract text from DOC (legacy Word format)"""
        try:
            validation = self.validate_file(doc_path, 'document')
            if not validation["success"]:
                return validation

            # Try using docx2txt which can handle .doc files
            try:
                text_content = docx2txt.process(doc_path)
                text_content = self.clean_extracted_text(text_content)
                
                result = {
                    "success": True,
                    "text": text_content,
                    "word_count": len(text_content.split()) if text_content else 0,
                    "char_count": len(text_content),
                    "extraction_method": "docx2txt",
                    "extraction_type": "doc"
                }
                
                # Extract keywords if requested and text is available
                if extract_keywords and text_content:
                    keyword_result = self.keyword_extractor.extract_keywords(text_content)
                    if keyword_result["success"]:
                        result["keywords"] = keyword_result
                
                return result
                
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
    
    def analyze_document(self, file_path, extract_keywords=True):
        """Main method to analyze any supported document type"""
        try:
            if not os.path.exists(file_path):
                return {"success": False, "error": "File not found"}
            
            file_ext = Path(file_path).suffix.lower()
            file_size = os.path.getsize(file_path)
            
            # Determine file type and extract accordingly
            if file_ext in self.supported_image_formats:
                result = self.extract_text_from_image(file_path, extract_keywords=extract_keywords)
            elif file_ext == '.pdf':
                result = self.extract_text_from_pdf(file_path, extract_keywords=extract_keywords)
            elif file_ext == '.docx':
                result = self.extract_text_from_docx(file_path, extract_keywords=extract_keywords)
            elif file_ext == '.doc':
                result = self.extract_text_from_doc(file_path, extract_keywords=extract_keywords)
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
            "service": "Enhanced Document Analysis Service with Keyword Extraction",
            "features": {
                "ocr": ocr_available,
                "pdf_analysis": True,
                "docx_analysis": True,
                "doc_analysis": True,
                "keyword_extraction": True
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
            "service": "Enhanced Document Analysis Service",
            "error": str(e)
        }), 500

# New Keyword Extraction Endpoints
@app.route('/keywords/extract', methods=['POST'])
def extract_keywords_only():
    """Extract keywords from text only"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "text is required"}), 400
        
        text = data['text']
        min_confidence = data.get('min_confidence', 0.7)
        
        result = document_processor.keyword_extractor.extract_keywords(text, min_confidence)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in extract_keywords_only: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/keywords/categories', methods=['GET'])
def get_keyword_categories():
    """Get available keyword categories"""
    return jsonify({
        "success": True,
        "categories": list(document_processor.keyword_extractor.all_patterns.keys())
    })

# Enhanced Document Analysis Endpoints
@app.route('/document/analyze', methods=['POST'])
def analyze_uploaded_document():
    """Analyze uploaded document (PDF, DOC, DOCX, or image) with keyword extraction"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        # Check if keyword extraction is requested
        extract_keywords = request.form.get('extract_keywords', 'true').lower() == 'true'
        
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1] if filename else '.tmp'
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            try:
                file.save(temp_file.name)
                result = document_processor.analyze_document(temp_file.name, extract_keywords=extract_keywords)
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
    """Analyze document from file path with keyword extraction"""
    try:
        data = request.get_json()
        
        if not data or 'file_path' not in data:
            return jsonify({"success": False, "error": "file_path is required"}), 400
        
        file_path = data['file_path']
        extract_keywords = data.get('extract_keywords', True)
        
        result = document_processor.analyze_document(file_path, extract_keywords=extract_keywords)
        
        if result["success"]:
            result["filename"] = os.path.basename(file_path)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in analyze_document_from_path: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

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
        extract_keywords = request.form.get('extract_keywords', 'true').lower() == 'true'
        
        file_ext = os.path.splitext(filename)[1] if filename else '.tmp'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            try:
                file.save(temp_file.name)
                result = document_processor.extract_text_from_image(
                    temp_file.name, lang=lang, preprocessing=preprocessing, extract_keywords=extract_keywords
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
        extract_keywords = data.get('extract_keywords', True)
        
        result = document_processor.extract_text_from_image(
            file_path, lang=lang, preprocessing=preprocessing, extract_keywords=extract_keywords
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
    
    logger.info("Starting Enhanced Document Analysis Service with Keyword Extraction on port 5001...")
    logger.info("Available endpoints:")
    logger.info("  OCR: /ocr/extract, /ocr/extract_from_path, /ocr/languages")
    logger.info("  Document Analysis: /document/analyze, /document/analyze_from_path")
    logger.info("  Keyword Extraction: /keywords/extract, /keywords/categories")
    logger.info("  Utilities: /health, /document/supported_formats")
    
    app.run(host='0.0.0.0', port=5001, debug=True)