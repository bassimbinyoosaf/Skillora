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
from typing import List, Dict, Any, Optional
# ADD THIS: Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()  # This loads the .env file
# NEW IMPORT
from gemini_job_recommender import GeminiJobRecommender

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000'])

# Configure Tesseract path (adjust based on your installation)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Enhanced Job Recommender using Gemini only
class EnhancedJobRecommender:
    """Enhanced job recommender using Google Gemini API with built-in fallback support"""
    def __init__(self):
        # Initialize Gemini recommender with better error handling
        try:
            self.gemini_recommender = GeminiJobRecommender()
            self.gemini_available = self.gemini_recommender.gemini_available
            if self.gemini_available:
                logger.info("✓ Gemini job recommender initialized successfully")
            else:
                logger.info("⚠ Gemini not available, using fallback recommendations")
                logger.info("Reason: API key missing, invalid, or package not installed")
        except ImportError as e:
            logger.error(f"✗ Failed to import GeminiJobRecommender: {e}")
            logger.error("Make sure gemini_job_recommender.py is in the same directory")
            self.gemini_recommender = None
            self.gemini_available = False
        except Exception as e:
            logger.error(f"✗ Failed to initialize Gemini: {e}")
            self.gemini_recommender = None
            self.gemini_available = False

        # Placeholder for learning paths (to be populated by Gemini or fallback)
        self.learning_paths = {}

    def recommend_jobs(self, skills: List[str], sectors: List[str] = None, top_k: int = 10) -> Dict[str, Any]:
        """
        Get job recommendations using Gemini API with fallback support
        """
        if not skills:
            return {
                "success": False,
                "error": "No skills provided",
                "source": "Enhanced Recommender"
            }
        # Primary: Try Gemini API
        if self.gemini_available and self.gemini_recommender:
            try:
                logger.info(f"Using Gemini API for job recommendations ({len(skills)} skills)")
                gemini_result = self.gemini_recommender.get_job_recommendations(skills, top_k=top_k)
                if gemini_result.get("success"):
                    enhanced_result = self._enhance_with_sectors(gemini_result, sectors)
                    enhanced_result["primary_source"] = "Google Gemini"
                    return enhanced_result
                else:
                    logger.warning("Gemini API failed, falling back to built-in recommendations")
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
        # Fallback
        logger.info("Using built-in fallback recommendations")
        if self.gemini_recommender:
            fallback_result = self.gemini_recommender._create_comprehensive_fallback(skills, top_k)
            fallback_result["primary_source"] = "Built-in Fallback"
            return fallback_result
        else:
            return self._create_basic_fallback(skills, top_k)

    def get_keyword_specific_recommendations(self, keyword: str, context_skills: List[str] = None, top_k: int = 5) -> Dict[str, Any]:
        """Get job recommendations for a specific keyword (with optional context)"""
        if not keyword:
            return {"success": False, "error": "Keyword cannot be empty"}
        all_skills = [keyword]
        if context_skills:
            all_skills.extend(context_skills)
        return self.recommend_jobs(all_skills, top_k=top_k)

    def _generate_learning_path(self, job_title: str, current_skills: str = "") -> Dict[str, Any]:
        """Generate a basic learning path (to be enhanced by Gemini if available)"""
        return {
            "job_title": job_title,
            "difficulty": "Intermediate",
            "estimated_time_weeks": 12,
            "steps": [
                {"step": 1, "topic": f"Foundations of {job_title.split()[0]}", "resources": ["Online course", "Books"]},
                {"step": 2, "topic": "Hands-on Projects", "resources": ["GitHub", "Kaggle"]},
                {"step": 3, "topic": "Certifications", "resources": ["Industry certs"]}
            ],
            "source": "Fallback Learning Path"
        }

    def _enhance_with_sectors(self, gemini_result: Dict, target_sectors: List[str] = None) -> Dict[str, Any]:
        jobs_by_sector = {}
        enhanced_jobs = []
        for job in gemini_result.get("job_recommendations", []):
            sector = job.get("sector", "Other")
            if sector not in jobs_by_sector:
                jobs_by_sector[sector] = []
            jobs_by_sector[sector].append(job)
            enhanced_jobs.append(job)

        if target_sectors:
            filtered_jobs = [job for job in enhanced_jobs if job.get("sector") in target_sectors]
            enhanced_jobs = filtered_jobs

        gemini_result.update({
            "job_recommendations": enhanced_jobs,
            "jobs_by_sector": jobs_by_sector,
            "sectors_found": list(jobs_by_sector.keys()),
            "filtered_by_sectors": bool(target_sectors)
        })
        return gemini_result

    def _create_basic_fallback(self, skills: List[str], top_k: int) -> Dict[str, Any]:
        basic_jobs = []
        for i, skill in enumerate(skills[:5]):
            basic_jobs.append({
                "title": f"{skill} Specialist",
                "description": f"Position requiring expertise in {skill}",
                "relevance_score": 0.8 - (i * 0.05),
                "required_skills": [skill],
                "skill_gaps": [],
                "sector": "Other",
                "source": "Basic Fallback"
            })
        return {
            "success": True,
            "job_recommendations": basic_jobs[:top_k],
            "total_jobs_found": len(basic_jobs),
            "unique_jobs": len(basic_jobs),
            "source": "Basic Fallback",
            "primary_source": "Basic Fallback (Last Resort)",
            "gemini_available": False
        }

# Local skill categorization without external APIs
class LocalSkillCategorizer:
    def __init__(self):
        self.sector_mapping = {
            'Information Technology': 'Technology',
            'Computer Science': 'Technology',
            'Software Development': 'Technology',
            'Data Science': 'Technology',
            'Engineering': 'Technology',
            'Web Development': 'Technology',
            'Cybersecurity': 'Technology',
            'Cloud Computing': 'Technology',
            'Artificial Intelligence': 'Technology',
            'Machine Learning': 'Technology',
            'DevOps': 'Technology',
            'Database Management': 'Technology',
            'Biology': 'Life Sciences',
            'Biotechnology': 'Life Sciences',
            'Biochemistry': 'Life Sciences',
            'Medical': 'Life Sciences',
            'Healthcare': 'Life Sciences',
            'Pharmaceuticals': 'Life Sciences',
            'Genetics': 'Life Sciences',
            'Microbiology': 'Life Sciences',
            'Molecular Biology': 'Life Sciences',
            'Biomedical': 'Life Sciences',
            'Physics': 'Physical Sciences',
            'Chemistry': 'Physical Sciences',
            'Mathematics': 'Physical Sciences',
            'Statistics': 'Physical Sciences',
            'Research': 'Physical Sciences',
            'Laboratory': 'Physical Sciences',
            'Scientific Analysis': 'Physical Sciences',
            'Materials Science': 'Physical Sciences',
            'Business': 'Business & Management',
            'Management': 'Business & Management',
            'Marketing': 'Business & Management',
            'Sales': 'Business & Management',
            'Finance': 'Business & Management',
            'Accounting': 'Business & Management',
            'Project Management': 'Business & Management',
            'Operations': 'Business & Management',
            'Strategy': 'Business & Management',
            'Leadership': 'Business & Management',
            'Education': 'Education & Training',
            'Teaching': 'Education & Training',
            'Training': 'Education & Training',
            'Curriculum Development': 'Education & Training',
            'Academic Research': 'Education & Training',
            'Design': 'Creative & Design',
            'Graphic Design': 'Creative & Design',
            'User Experience': 'Creative & Design',
            'User Interface': 'Creative & Design',
            'Creative Writing': 'Creative & Design',
            'Art': 'Creative & Design',
            'Media': 'Creative & Design',
            'Manufacturing': 'Industrial & Manufacturing',
            'Production': 'Industrial & Manufacturing',
            'Quality Control': 'Industrial & Manufacturing',
            'Supply Chain': 'Industrial & Manufacturing',
            'Logistics': 'Industrial & Manufacturing',
            'Social Work': 'Social Sciences',
            'Psychology': 'Social Sciences',
            'Sociology': 'Social Sciences',
            'Public Policy': 'Social Sciences',
            'Human Resources': 'Social Sciences',
            'Communications': 'Social Sciences'
        }

    def categorize_skills(self, skills: List[str]) -> Dict[str, Any]:
        logger.info("Using local skill categorization")
        categorized_skills = []
        sectors_found = set()
        for skill in skills:
            categorized_skill = self._categorize_single_skill(skill)
            categorized_skills.append(categorized_skill)
            sectors_found.add(categorized_skill['sector'])
        return {
            'success': True,
            'categorized_skills': categorized_skills,
            'total_skills_processed': len(skills),
            'skills_categorized': len(categorized_skills),
            'source': 'Local',
            'sectors_found': list(sectors_found)
        }

    def _categorize_single_skill(self, skill: str) -> Dict:
        sector = self._determine_sector(skill, skill)
        return {
            'skill_name': skill,
            'skill_id': '',
            'normalized_name': skill,
            'category': 'General',
            'subcategory': '',
            'sector': sector,
            'skill_type': '',
            'confidence': 0.8,
            'source': 'Local',
            'related_jobs': []
        }

    def _determine_sector(self, category: str, subcategory: str = '') -> str:
        combined_text = f"{category} {subcategory}".lower()
        if any(keyword in combined_text for keyword in [
            'computer', 'software', 'programming', 'web', 'data', 'technology', 
            'digital', 'cyber', 'cloud', 'artificial intelligence', 'machine learning',
            'react', 'javascript', 'python', 'java', 'html', 'css', 'sql', 'aws',
            'docker', 'kubernetes', 'git', 'nodejs', 'angular', 'vue'
        ]):
            return 'Technology'
        elif any(keyword in combined_text for keyword in [
            'biology', 'medical', 'health', 'pharma', 'biotech', 'genetic', 'clinical'
        ]):
            return 'Life Sciences'
        elif any(keyword in combined_text for keyword in [
            'physics', 'chemistry', 'mathematics', 'research', 'scientific', 'laboratory'
        ]):
            return 'Physical Sciences'
        elif any(keyword in combined_text for keyword in [
            'business', 'management', 'finance', 'marketing', 'sales', 'accounting'
        ]):
            return 'Business & Management'
        elif any(keyword in combined_text for keyword in [
            'education', 'teaching', 'training', 'academic'
        ]):
            return 'Education & Training'
        elif any(keyword in combined_text for keyword in [
            'design', 'creative', 'art', 'media', 'graphic', 'ux', 'ui'
        ]):
            return 'Creative & Design'
        elif any(keyword in combined_text for keyword in [
            'manufacturing', 'production', 'industrial', 'engineering'
        ]):
            return 'Industrial & Manufacturing'
        elif any(keyword in combined_text for keyword in [
            'social', 'psychology', 'human resources', 'communication'
        ]):
            return 'Social Sciences'
        else:
            return 'Other'

# KeywordExtractor (unchanged from original)
class KeywordExtractor:
    def __init__(self):
        self.programming_languages = [
            r'\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|R|MATLAB|Perl|Dart|Elixir|Haskell)\b',
            r'\b(?:HTML|CSS|SQL|NoSQL|GraphQL|XML|JSON|YAML)\b',
            r'\b(?:React(?:\.js)?|Angular(?:\.js)?|Vue(?:\.js)?|Svelte|Next\.js|Nuxt\.js|Gatsby)\b',
            r'\b(?:Node\.js|Express\.js|Django|Flask|Laravel|Spring|ASP\.NET|Rails)\b'
        ]
        self.frameworks_libraries = [
            r'\b(?:TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy|OpenCV|Keras|NLTK|SpaCy)\b',
            r'\b(?:Bootstrap|Tailwind|Material-UI|Ant Design|Chakra UI|Bulma)\b',
            r'\b(?:jQuery|Lodash|Axios|D3\.js|Three\.js|Chart\.js|Moment\.js)\b',
            r'\b(?:Redux|MobX|Vuex|Pinia|Context API|Zustand)\b'
        ]
        self.databases_tools = [
            r'\b(?:MongoDB|MySQL|PostgreSQL|SQLite|Redis|Elasticsearch|DynamoDB|Firebase|Supabase)\b',
            r'\b(?:Docker|Kubernetes|Jenkins|GitHub Actions|GitLab CI|Travis CI|CircleCI)\b',
            r'\b(?:AWS|Azure|Google Cloud|GCP|Heroku|Vercel|Netlify|DigitalOcean)\b',
            r'\b(?:Git|SVN|Mercurial|Bitbucket|GitHub|GitLab)\b'
        ]
        self.certifications = [
            r'\b(?:AWS|Amazon Web Services)\s+(?:Certified\s+)?(?:Solutions Architect|Developer|SysOps|Cloud Practitioner|DevOps Engineer|Security|Machine Learning|Data Analytics)\b',
            r'\b(?:Microsoft|Azure)\s+(?:Certified\s+)?(?:Azure Administrator|Azure Developer|Azure Architect|Azure DevOps|Azure Security|Azure Data|Azure AI)\b',
            r'\b(?:Google Cloud|GCP)\s+(?:Certified\s+)?(?:Associate Cloud Engineer|Professional Cloud Architect|Professional Data Engineer|Professional Machine Learning)\b',
            r'\b(?:Cisco)\s+(?:Certified\s+)?(?:CCNA|CCNP|CCIE|CCDA|CCDP|CCSP)\b',
            r'\b(?:Oracle)\s+(?:Certified\s+)?(?:Associate|Professional|Master|Expert)\b',
            r'\b(?:CompTIA)\s+(?:A\+|Network\+|Security\+|Cloud\+|Linux\+|Project\+|Server\+)\b',
            r'\b(?:Scrum Master|Product Owner|CSM|CSPO|PSM|PSPO|SAFe|Agile)\s+(?:Certified|Certification)?\b',
            r'\b(?:PMP|Project Management Professional|CAPM|Prince2|Six Sigma|Lean)\b'
        ]
        self.education_patterns = [
            r'\b(?:Bachelor|Master|PhD|Doctorate|Associate)\s+(?:of\s+)?(?:Science|Arts|Engineering|Technology|Computer Science|Information Technology|Business|Management)\b',
            r'\b(?:B\.Tech|M\.Tech|B\.E\.|M\.E\.|B\.S\.|M\.S\.|B\.A\.|M\.A\.|MBA|MCA|BCA)\b',
            r'\b(?:Computer Science|Information Technology|Software Engineering|Data Science|Machine Learning|Artificial Intelligence)\b'
        ]
        self.methodologies = [
            r'\b(?:Agile|Scrum|Kanban|DevOps|CI/CD|TDD|BDD|Microservices|RESTful|GraphQL)\b',
            r'\b(?:Machine Learning|Deep Learning|Data Science|Big Data|Analytics|Statistics|NLP|Computer Vision)\b',
            r'\b(?:UI/UX|User Experience|User Interface|Design Thinking|Figma|Sketch|Adobe|Photoshop)\b'
        ]
        self.all_patterns = {
            'programming_languages': self.programming_languages,
            'frameworks_libraries': self.frameworks_libraries,
            'databases_tools': self.databases_tools,
            'certifications': self.certifications,
            'education': self.education_patterns,
            'methodologies': self.methodologies
        }

    def extract_keywords(self, text, min_confidence=0.7):
        if not text or not isinstance(text, str):
            return {"success": False, "error": "Invalid or empty text provided"}
        cleaned_text = self.clean_text_for_extraction(text)
        found_keywords = {}
        all_matches = []
        for category, patterns in self.all_patterns.items():
            category_matches = []
            for pattern in patterns:
                matches = re.finditer(pattern, cleaned_text, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    keyword = match.group().strip()
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
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s\.\+\#\-/]', ' ', text)
        return text.strip()

    def calculate_confidence(self, keyword, context, category):
        confidence = 0.8
        context_lower = context.lower()
        if any(word in context_lower for word in ['certified', 'certification', 'certificate', 'diploma', 'degree']):
            confidence += 0.15
        if any(word in context_lower for word in ['experience', 'skilled', 'proficient', 'expert', 'years']):
            confidence += 0.1
        if any(word in context_lower for word in ['project', 'developed', 'built', 'created', 'implemented']):
            confidence += 0.05
        return min(confidence, 1.0)

    def get_top_keywords(self, all_matches, keyword_counts, limit=10):
        keyword_scores = {}
        for match in all_matches:
            keyword_lower = match['keyword'].lower()
            frequency = keyword_counts[keyword_lower]
            confidence = match['confidence']
            score = frequency * 0.6 + confidence * 0.4
            if keyword_lower not in keyword_scores or score > keyword_scores[keyword_lower]['score']:
                keyword_scores[keyword_lower] = {
                    'keyword': match['keyword'],
                    'category': match['category'],
                    'frequency': frequency,
                    'confidence': confidence,
                    'score': score
                }
        sorted_keywords = sorted(keyword_scores.values(), key=lambda x: x['score'], reverse=True)
        return sorted_keywords[:limit]

# Updated DocumentProcessor
class DocumentProcessor:
    def __init__(self):
        self.supported_image_formats = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif']
        self.supported_doc_formats = ['.pdf', '.doc', '.docx']
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.keyword_extractor = KeywordExtractor()
        self.skill_categorizer = LocalSkillCategorizer()
        self.job_recommender = EnhancedJobRecommender()

    def validate_file(self, file_path, file_type=None):
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

    def preprocess_image(self, image_path):
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

    def extract_text_from_image(self, image_path, lang='eng', preprocessing=True, custom_config=None, extract_keywords=True, categorize_skills=True, recommend_jobs=True):
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

            if text and extract_keywords:
                result = self._add_analysis_results(result, text, categorize_skills, recommend_jobs)
            return result
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            return {"success": False, "error": str(e)}

    def extract_text_from_pdf(self, pdf_path, extract_keywords=True, categorize_skills=True, recommend_jobs=True):
        try:
            validation = self.validate_file(pdf_path, 'document')
            if not validation["success"]:
                return validation

            text_content = ""
            page_count = 0
            method_used = "unknown"

            try:
                doc = fitz.open(pdf_path)
                page_count = len(doc)
                text_parts = []
                for page_num in range(page_count):
                    page = doc.load_page(page_num)
                    text = page.get_text()
                    if text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
                text_content = "\n".join(text_parts)
                method_used = "PyMuPDF"
                doc.close()
            except Exception as e:
                logger.warning(f"PyMuPDF failed, trying pdfplumber: {str(e)}")
                try:
                    with pdfplumber.open(pdf_path) as pdf:
                        page_count = len(pdf.pages)
                        text_parts = []
                        for i, page in enumerate(pdf.pages):
                            text = page.extract_text()
                            if text and text.strip():
                                text_parts.append(f"--- Page {i + 1} ---\n{text.strip()}")
                        text_content = "\n".join(text_parts)
                        method_used = "pdfplumber"
                except Exception as e2:
                    logger.warning(f"pdfplumber failed, trying PyPDF2: {str(e2)}")
                    try:
                        with open(pdf_path, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            page_count = len(pdf_reader.pages)
                            text_parts = []
                            for i, page in enumerate(pdf_reader.pages):
                                text = page.extract_text()
                                if text and text.strip():
                                    text_parts.append(f"--- Page {i + 1} ---\n{text.strip()}")
                            text_content = "\n".join(text_parts)
                            method_used = "PyPDF2"
                    except Exception as e3:
                        return {"success": False, "error": f"All PDF extraction methods failed: {str(e3)}"}

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

            if text_content and extract_keywords:
                result = self._add_analysis_results(result, text_content, categorize_skills, recommend_jobs)
            return result
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            return {"success": False, "error": str(e)}

    def extract_text_from_docx(self, docx_path, extract_keywords=True, categorize_skills=True, recommend_jobs=True):
        try:
            validation = self.validate_file(docx_path, 'document')
            if not validation["success"]:
                return validation

            text_content = ""
            method_used = "unknown"

            try:
                with open(docx_path, "rb") as docx_file:
                    result = mammoth.extract_raw_text(docx_file)
                    text_content = result.value
                    method_used = "mammoth"
            except Exception as e:
                logger.warning(f"Mammoth failed, trying docx2txt: {str(e)}")
                try:
                    text_content = docx2txt.process(docx_path)
                    method_used = "docx2txt"
                except Exception as e2:
                    logger.warning(f"docx2txt failed, trying python-docx: {str(e2)}")
                    try:
                        doc = docx.Document(docx_path)
                        paragraphs = []
                        for paragraph in doc.paragraphs:
                            if paragraph.text.strip():
                                paragraphs.append(paragraph.text.strip())
                        text_content = "\n".join(paragraphs)
                        method_used = "python-docx"
                    except Exception as e3:
                        return {"success": False, "error": f"All DOCX extraction methods failed: {str(e3)}"}

            text_content = self.clean_extracted_text(text_content)
            result = {
                "success": True,
                "text": text_content,
                "word_count": len(text_content.split()) if text_content else 0,
                "char_count": len(text_content),
                "extraction_method": method_used,
                "extraction_type": "docx"
            }

            if text_content and extract_keywords:
                result = self._add_analysis_results(result, text_content, categorize_skills, recommend_jobs)
            return result
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            return {"success": False, "error": str(e)}

    def extract_text_from_doc(self, doc_path, extract_keywords=True, categorize_skills=True, recommend_jobs=True):
        try:
            validation = self.validate_file(doc_path, 'document')
            if not validation["success"]:
                return validation

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
                if text_content and extract_keywords:
                    result = self._add_analysis_results(result, text_content, categorize_skills, recommend_jobs)
                return result
            except Exception as e:
                return {
                    "success": False, 
                    "error": f"DOC extraction failed. Consider converting to DOCX format first: {str(e)}"
                }
        except Exception as e:
            logger.error(f"Error extracting text from DOC: {str(e)}")
            return {"success": False, "error": str(e)}

    def _add_analysis_results(self, result, text, categorize_skills, recommend_jobs):
        keyword_result = self.keyword_extractor.extract_keywords(text)
        if keyword_result["success"]:
            result["keywords"] = keyword_result
            skills = [kw['keyword'] for kw in keyword_result.get('top_keywords', [])]
            if categorize_skills and skills:
                skill_categorization = self.skill_categorizer.categorize_skills(skills)
                result["skill_categorization"] = skill_categorization
                sectors = skill_categorization.get('sectors_found', [])
            else:
                sectors = []
            if recommend_jobs and skills:
                job_recommendations = self.job_recommender.recommend_jobs(skills, sectors)
                result["job_recommendations"] = job_recommendations
        return result

    def clean_extracted_text(self, text):
        if not text:
            return ""
        text = re.sub(r'\n\s*\n\s*\n', '\n', text)
        text = re.sub(r' +', ' ', text)
        return text.strip()

    def analyze_document(self, file_path, extract_keywords=True, categorize_skills=True, recommend_jobs=True):
        try:
            if not os.path.exists(file_path):
                return {"success": False, "error": "File not found"}

            file_ext = Path(file_path).suffix.lower()
            file_size = os.path.getsize(file_path)

            if file_ext in self.supported_image_formats:
                result = self.extract_text_from_image(file_path, extract_keywords=extract_keywords, categorize_skills=categorize_skills, recommend_jobs=recommend_jobs)
            elif file_ext == '.pdf':
                result = self.extract_text_from_pdf(file_path, extract_keywords=extract_keywords, categorize_skills=categorize_skills, recommend_jobs=recommend_jobs)
            elif file_ext == '.docx':
                result = self.extract_text_from_docx(file_path, extract_keywords=extract_keywords, categorize_skills=categorize_skills, recommend_jobs=recommend_jobs)
            elif file_ext == '.doc':
                result = self.extract_text_from_doc(file_path, extract_keywords=extract_keywords, categorize_skills=categorize_skills, recommend_jobs=recommend_jobs)
            else:
                return {"success": False, "error": f"Unsupported file format: {file_ext}"}

            if result["success"]:
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

# Existing endpoints (unchanged)
@app.route('/gemini/test', methods=['POST'])
def test_gemini_recommendations():
    try:
        data = request.get_json()
        if not data or 'skills' not in data:
            return jsonify({"success": False, "error": "skills array is required"}), 400
        skills = data['skills']
        context = data.get('context', None)
        if not isinstance(skills, list):
            return jsonify({"success": False, "error": "skills must be an array"}), 400
        try:
            gemini_recommender = GeminiJobRecommender()
            result = gemini_recommender.get_job_recommendations(skills, context)
            return jsonify(result)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Gemini test failed: {str(e)}",
                "gemini_available": False
            }), 500
    except Exception as e:
        logger.error(f"Error in test_gemini_recommendations: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/document/analyze', methods=['POST'])
def analyze_uploaded_document():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400

        extract_keywords = request.form.get('extract_keywords', 'true').lower() == 'true'
        categorize_skills = request.form.get('categorize_skills', 'true').lower() == 'true'
        recommend_jobs = request.form.get('recommend_jobs', 'true').lower() == 'true'

        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1] if filename else '.tmp'

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            try:
                file.save(temp_file.name)
                result = document_processor.analyze_document(
                    temp_file.name, 
                    extract_keywords=extract_keywords,
                    categorize_skills=categorize_skills,
                    recommend_jobs=recommend_jobs
                )
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
    try:
        data = request.get_json()
        if not data or 'file_path' not in data:
            return jsonify({"success": False, "error": "file_path is required"}), 400
        file_path = data['file_path']
        extract_keywords = data.get('extract_keywords', True)
        categorize_skills = data.get('categorize_skills', True)
        recommend_jobs = data.get('recommend_jobs', True)

        result = document_processor.analyze_document(
            file_path, 
            extract_keywords=extract_keywords,
            categorize_skills=categorize_skills,
            recommend_jobs=recommend_jobs
        )
        if result["success"]:
            result["filename"] = os.path.basename(file_path)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in analyze_document_from_path: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/skills/categorize', methods=['POST'])
def categorize_skills():
    try:
        data = request.get_json()
        if not data or 'skills' not in data:
            return jsonify({"success": False, "error": "skills array is required"}), 400
        skills = data['skills']
        if not isinstance(skills, list):
            return jsonify({"success": False, "error": "skills must be an array"}), 400
        result = document_processor.skill_categorizer.categorize_skills(skills)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in categorize_skills: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/jobs/recommend', methods=['POST'])
def recommend_jobs():
    try:
        data = request.get_json()
        if not data or 'skills' not in data:
            return jsonify({"success": False, "error": "skills array is required"}), 400
        skills = data['skills']
        sectors = data.get('sectors', None)
        top_k = data.get('top_k', 10)
        if not isinstance(skills, list):
            return jsonify({"success": False, "error": "skills must be an array"}), 400
        result = document_processor.job_recommender.recommend_jobs(skills, sectors, top_k)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in recommend_jobs: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/analyze_and_recommend', methods=['POST'])
def analyze_and_recommend():
    try:
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"success": False, "error": "No file selected"}), 400
            filename = secure_filename(file.filename)
            file_ext = os.path.splitext(filename)[1] if filename else '.tmp'
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                try:
                    file.save(temp_file.name)
                    result = document_processor.analyze_document(
                        temp_file.name, 
                        extract_keywords=True,
                        categorize_skills=True,
                        recommend_jobs=True
                    )
                    if result["success"]:
                        result["filename"] = filename
                    return jsonify(result)
                finally:
                    try:
                        os.unlink(temp_file.name)
                    except OSError:
                        pass
        else:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "No data provided"}), 400
            if 'text' in data:
                text = data['text']
                result = {
                    "success": True,
                    "text": text,
                    "word_count": len(text.split()) if text else 0,
                    "char_count": len(text),
                    "extraction_type": "direct_input"
                }
                result = document_processor._add_analysis_results(result, text, True, True)
                return jsonify(result)
            elif 'skills' in data:
                skills = data['skills']
                if not isinstance(skills, list):
                    return jsonify({"success": False, "error": "skills must be an array"}), 400
                skill_categorization = document_processor.skill_categorizer.categorize_skills(skills)
                sectors = list(set([skill.get('sector', 'Other') for skill in skill_categorization['categorized_skills']]))
                job_recommendations = document_processor.job_recommender.recommend_jobs(skills, sectors)
                return jsonify({
                    "success": True,
                    "skills_input": skills,
                    "skill_categorization": skill_categorization,
                    "sectors_identified": sectors,
                    "job_recommendations": job_recommendations,
                    "analysis_type": "direct_skills"
                })
            else:
                return jsonify({"success": False, "error": "Either 'file', 'text', or 'skills' must be provided"}), 400
    except Exception as e:
        logger.error(f"Error in analyze_and_recommend: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/sectors', methods=['GET'])
def get_available_sectors():
    sectors = [
        "Technology",
        "Life Sciences", 
        "Physical Sciences",
        "Business & Management",
        "Education & Training",
        "Creative & Design",
        "Industrial & Manufacturing",
        "Social Sciences",
        "Other"
    ]
    return jsonify({
        "success": True,
        "sectors": sectors,
        "total_sectors": len(sectors)
    })

@app.route('/sectors/<sector>/skills', methods=['GET'])
def get_skills_by_sector(sector):
    sector_skills = {
        "Technology": [
            "Python", "JavaScript", "Java", "React", "Node.js", "SQL", "AWS", 
            "Machine Learning", "Data Science", "Software Development"
        ],
        "Life Sciences": [
            "Biology", "Medical Research", "Clinical Trials", "Biotechnology", 
            "Pharmaceuticals", "Laboratory Skills", "Genetics", "Biochemistry"
        ],
        "Physical Sciences": [
            "Physics", "Chemistry", "Mathematics", "Statistics", "Research", 
            "Laboratory Analysis", "Materials Science", "Data Analysis"
        ],
        "Business & Management": [
            "Project Management", "Business Analysis", "Finance", "Marketing", 
            "Leadership", "Strategic Planning", "Operations Management"
        ],
        "Education & Training": [
            "Teaching", "Curriculum Development", "Training Design", "Assessment", 
            "Educational Technology", "Learning Management"
        ],
        "Creative & Design": [
            "Graphic Design", "UX/UI Design", "Creative Writing", "Art Direction", 
            "Media Production", "Brand Design"
        ],
        "Industrial & Manufacturing": [
            "Manufacturing", "Quality Control", "Production Planning", "Supply Chain", 
            "Industrial Engineering", "Process Optimization"
        ],
        "Social Sciences": [
            "Psychology", "Social Work", "Human Resources", "Communication", 
            "Public Policy", "Research Methods"
        ]
    }
    skills = sector_skills.get(sector, [])
    return jsonify({
        "success": True,
        "sector": sector,
        "skills": skills,
        "skill_count": len(skills)
    })

@app.route('/keywords/extract', methods=['POST'])
def extract_keywords_only():
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
    return jsonify({
        "success": True,
        "categories": list(document_processor.keyword_extractor.all_patterns.keys())
    })

@app.route('/document/supported_formats', methods=['GET'])
def get_supported_formats():
    return jsonify({
        "success": True,
        "formats": {
            "images": document_processor.supported_image_formats,
            "documents": document_processor.supported_doc_formats,
            "all": document_processor.supported_image_formats + document_processor.supported_doc_formats
        }
    })

# ✅ NEW ENDPOINTS ADDED HERE (after existing ones)

@app.route('/keywords/recommend', methods=['POST'])
def recommend_jobs_for_keyword():
    """Get job recommendations for a specific keyword with learning paths"""
    try:
        data = request.get_json()
        if not data or 'keyword' not in data:
            return jsonify({"success": False, "error": "keyword is required"}), 400

        keyword = data['keyword']
        top_k = data.get('top_k', 5)

        if not isinstance(keyword, str) or not keyword.strip():
            return jsonify({"success": False, "error": "keyword must be a non-empty string"}), 400

        # Use the enhanced job recommender with only the selected keyword
        result = document_processor.job_recommender.get_keyword_specific_recommendations(
            keyword=keyword.strip(),
            context_skills=[],  # Empty context to focus only on selected keyword
            top_k=top_k
        )
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in recommend_jobs_for_keyword: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/keywords/<keyword>/jobs', methods=['POST'])
def get_jobs_for_specific_keyword(keyword):
    """RESTful endpoint for getting jobs for a specific keyword"""
    try:
        data = request.get_json() or {}
        context_skills = data.get('context_skills', [])
        top_k = data.get('top_k', 5)

        if not keyword or not keyword.strip():
            return jsonify({"success": False, "error": "keyword path parameter is required"}), 400

        result = document_processor.job_recommender.get_keyword_specific_recommendations(
            keyword=keyword.strip(),
            context_skills=context_skills,
            top_k=top_k
        )
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in get_jobs_for_specific_keyword: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/learning/paths', methods=['POST'])
def get_learning_paths():
    """Get comprehensive learning paths for multiple job titles"""
    try:
        data = request.get_json()
        if not data or 'job_titles' not in data:
            return jsonify({"success": False, "error": "job_titles array is required"}), 400

        job_titles = data['job_titles']
        if not isinstance(job_titles, list):
            return jsonify({"success": False, "error": "job_titles must be an array"}), 400

        learning_paths = {}
        for job_title in job_titles:
            if job_title in document_processor.job_recommender.learning_paths:
                learning_paths[job_title] = document_processor.job_recommender.learning_paths[job_title]
            else:
                # Generate a learning path
                learning_paths[job_title] = document_processor.job_recommender._generate_learning_path(job_title, "")

        return jsonify({
            "success": True,
            "learning_paths": learning_paths,
            "job_titles_processed": len(job_titles),
            "paths_found": len(learning_paths)
        })

    except Exception as e:
        logger.error(f"Error in get_learning_paths: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# ✅ UPDATED /health ENDPOINT
@app.route('/health', methods=['GET'])
def health_check():
    try:
        ocr_available = True
        tesseract_version = None
        try:
            tesseract_version = str(pytesseract.get_tesseract_version())
        except Exception:
            ocr_available = False

        gemini_available = False
        gemini_status = "Not configured"
        try:
            test_recommender = GeminiJobRecommender()
            gemini_available = test_recommender.gemini_available
            gemini_status = "Available" if gemini_available else "API key missing or invalid"
        except Exception as e:
            gemini_status = f"Error: {str(e)}"

        return jsonify({
            "status": "healthy",
            "available": True,
            "service": "Enhanced Document Analysis Service with Keyword-Specific Job Recommendations",
            "version": "2.0.0",
            "features": {
                "ocr": ocr_available,
                "pdf_analysis": True,
                "docx_analysis": True,
                "doc_analysis": True,
                "keyword_extraction": True,
                "local_skill_categorization": True,
                "sector_based_classification": True,
                "google_gemini_jobs": gemini_available,
                "built_in_job_fallback": True,
                "keyword_specific_recommendations": True,
                "learning_path_generation": True,
                "skill_gap_analysis": True
            },
            "tesseract_version": tesseract_version,
            "gemini_status": gemini_status,
            "supported_formats": {
                "images": document_processor.supported_image_formats,
                "documents": document_processor.supported_doc_formats
            },
            "sectors": [
                "Technology",
                "Data Science",
                "Design",
                "Management", 
                "Cloud & DevOps",
                "Life Sciences", 
                "Physical Sciences",
                "Business & Management",
                "Education & Training",
                "Creative & Design",
                "Industrial & Manufacturing",
                "Social Sciences",
                "Other"
            ],
            "integrations": {
                "local_processing": "All processing done locally without external APIs",
                "google_gemini": "AI-powered job recommendations with learning paths (Primary)",
                "built_in_fallback": "Local job recommendations with learning paths (Fallback)"
            },
            "endpoints": {
                "document_analysis": "/document/analyze, /analyze_and_recommend",
                "job_recommendations": "/jobs/recommend",
                "keyword_specific_jobs": "/keywords/recommend, /keywords/<keyword>/jobs",
                "learning_paths": "/learning/paths",
                "gemini_test": "/gemini/test",
                "skill_categorization": "/skills/categorize"
            },
            "new_features": {
                "keyword_selection": "Select specific keywords for targeted job recommendations",
                "learning_paths": "Detailed learning roadmaps for each recommended job",
                "skill_gap_analysis": "Identify skills needed for target roles",
                "difficulty_assessment": "Beginner/Intermediate/Advanced difficulty levels",
                "time_estimates": "Realistic time-to-proficiency estimates"
            }
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "available": False,
            "service": "Enhanced Document Analysis Service",
            "error": str(e)
        }), 500

# Error handlers
@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"success": False, "error": "File too large (max 10MB)"}), 413

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({"success": False, "error": "Internal server error"}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404

# Startup logic
if __name__ == '__main__':
    missing_deps = []
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        logger.info("✓ Tesseract OCR is available")
    except Exception as e:
        missing_deps.append("Tesseract OCR")
        logger.warning(f"✗ Tesseract OCR not available: {str(e)}")

    try:
        import docx
        import docx2txt
        import mammoth
        logger.info("✓ Document processing libraries are available")
    except ImportError as e:
        missing_deps.append("Document processing libraries")
        logger.warning(f"✗ Document libraries not available: {str(e)}")

    try:
        import fitz
        logger.info("✓ PyMuPDF is available")
    except ImportError:
        logger.warning("⚠ PyMuPDF not available, falling back to other PDF methods")

    try:
        import pdfplumber
        logger.info("✓ pdfplumber is available")
    except ImportError:
        logger.warning("⚠ pdfplumber not available, falling back to PyPDF2")

    try:
        import google.generativeai as genai
        logger.info("✓ Google Gemini AI library is available")
    except ImportError:
        logger.warning("✗ Google Gemini library not available")
        missing_deps.append("Google Generative AI")

    try:
        from dotenv import load_dotenv
        logger.info("✓ python-dotenv is available")
    except ImportError:
        logger.error("✗ python-dotenv not found. Install with: pip install python-dotenv")
        missing_deps.append("python-dotenv")

    if missing_deps:
        logger.warning(f"Some features may not work due to missing dependencies: {', '.join(missing_deps)}")
        if "python-dotenv" in missing_deps:
            logger.error("CRITICAL: python-dotenv is required to load environment variables!")
            sys.exit(1)

    gemini_api_key = os.getenv('GEMINI_API_KEY')
    gemini_configured = bool(gemini_api_key)
    logger.info(f"Google Gemini API: {'✓ Configured' if gemini_configured else '✗ Not Configured (will use fallback)'}")
    if gemini_configured:
        logger.info(f"Gemini API Key: {gemini_api_key[:10]}...{gemini_api_key[-4:] if len(gemini_api_key) > 14 else 'short'}")

    logger.info("")
    logger.info("🚀 Starting Enhanced Document Analysis Service with Google Gemini Integration on port 5001...")
    logger.info("")
    logger.info("📋 Available endpoints:")
    logger.info("  • Document Analysis: /document/analyze, /document/analyze_from_path")
    logger.info("  • Combined Analysis: /analyze_and_recommend (single endpoint for everything)")
    logger.info("  • Gemini Jobs: /jobs/recommend (now uses Gemini API)")
    logger.info("  • Keyword Jobs: /keywords/recommend, /keywords/<keyword>/jobs")
    logger.info("  • Learning Paths: /learning/paths")
    logger.info("  • Gemini Test: /gemini/test (test Gemini directly)")
    logger.info("  • Skills: /skills/categorize")
    logger.info("  • Sectors: /sectors, /sectors/<sector>/skills")
    logger.info("  • Keywords: /keywords/extract, /keywords/categories")
    logger.info("  • Utilities: /health, /document/supported_formats")
    logger.info("")
    logger.info("⚙️  Environment Variables:")
    logger.info("  • GEMINI_API_KEY - Your Google Gemini API Key")
    logger.info("")
    logger.info("🎯 Job Recommendation Priority:")
    logger.info("  1. Google Gemini API (Primary - AI-powered)")
    logger.info("  2. Built-in Fallback (Secondary - Local mappings)")
    logger.info("")
    logger.info("🤖 Google Gemini Integration:")
    logger.info("  • Skill -> Job mapping with ranked recommendations")
    logger.info("  • AI-powered job matching and explanations")
    logger.info("  • Relevance scoring and sector classification")
    logger.info("  • Automatic fallback if API unavailable")
    logger.info("")

    app.run(host='0.0.0.0', port=5001, debug=True)