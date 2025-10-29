import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
import time
from collections import Counter
import threading

# Try to import Google Generative AI, handle gracefully if not available
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError as e:
    GENAI_AVAILABLE = False
    genai = None

logger = logging.getLogger(__name__)


class GeminiJobRecommender:
    """Google Gemini-only job recommendation system with comprehensive fallback and keyword selection"""

    def __init__(self, api_key: str = None):
        # Initialize skill mappings FIRST - this is critical
        self._initialize_skill_mappings()
        self._initialize_learning_paths()
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.gemini_available = False
        self.model = None

        # Rate limiting with thread safety
        self.last_request_time = 0
        self.min_request_interval = 1.2
        self._rate_limit_lock = threading.Lock()

        if not GENAI_AVAILABLE:
            logger.warning("Google Generative AI package not installed. Using fallback only.")
            return

        if not self.api_key:
            logger.warning("Gemini API key not found. Will use comprehensive fallback recommendations.")
            return

        try:
            # Configure Gemini
            genai.configure(api_key=self.api_key)
            # Test with different model names
            model_names = [
                "models/gemini-1.5-flash-latest",
                "models/gemini-1.5-flash",
                "models/gemini-1.5-pro-latest"
            ]

            for model_name in model_names:
                try:
                    self.model = genai.GenerativeModel(model_name)
                    # Test the model with a simple call
                    test_response = self.model.generate_content("Hello")
                    if test_response and test_response.text:
                        self.gemini_available = True
                        logger.info(f"Successfully initialized {model_name}")
                        break
                except Exception as e:
                    logger.warning(f"Failed to initialize {model_name}: {e}")
                    continue

            if not self.gemini_available:
                logger.error("No compatible Gemini model found or API key invalid")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            self.gemini_available = False

    def _initialize_skill_mappings(self):
        """Initialize comprehensive skill-to-job mappings - ALWAYS CALLED"""
        self.skill_job_mappings = {
            # Programming Languages
            'python': [
                {'job': 'Python Developer', 'score': 95, 'reason': 'Core Python programming expertise'},
                {'job': 'Backend Developer', 'score': 90, 'reason': 'Server-side development with Python'},
                {'job': 'Data Scientist', 'score': 85, 'reason': 'Python for data analysis and ML'}
            ],
            'javascript': [
                {'job': 'JavaScript Developer', 'score': 95, 'reason': 'Core JavaScript programming skills'},
                {'job': 'Frontend Developer', 'score': 90, 'reason': 'Essential for frontend development'},
                {'job': 'Full Stack Developer', 'score': 85, 'reason': 'Used across the full technology stack'}
            ],
            'java': [
                {'job': 'Java Developer', 'score': 95, 'reason': 'Enterprise Java development'},
                {'job': 'Backend Developer', 'score': 90, 'reason': 'Server-side Java applications'},
                {'job': 'Software Engineer', 'score': 85, 'reason': 'Large-scale software development'}
            ],
            'react': [
                {'job': 'React Developer', 'score': 95, 'reason': 'Direct React framework expertise'},
                {'job': 'Frontend Developer', 'score': 90, 'reason': 'Modern frontend development with React'},
                {'job': 'Full Stack Developer', 'score': 80, 'reason': 'Frontend-heavy full-stack roles'}
            ],
            'node.js': [
                {'job': 'Node.js Developer', 'score': 95, 'reason': 'Server-side JavaScript expertise'},
                {'job': 'Backend Developer', 'score': 90, 'reason': 'Modern backend development'},
                {'job': 'Full Stack Developer', 'score': 85, 'reason': 'JavaScript across the stack'}
            ],
            'angular': [
                {'job': 'Angular Developer', 'score': 95, 'reason': 'Direct Angular framework skills'},
                {'job': 'Frontend Developer', 'score': 90, 'reason': 'Enterprise frontend development'},
                {'job': 'Web Developer', 'score': 85, 'reason': 'Web application development'}
            ],
            'vue': [
                {'job': 'Vue.js Developer', 'score': 95, 'reason': 'Vue.js framework specialization'},
                {'job': 'Frontend Developer', 'score': 90, 'reason': 'Progressive frontend development'},
                {'job': 'Web Developer', 'score': 85, 'reason': 'Modern web applications'}
            ],
            'typescript': [
                {'job': 'TypeScript Developer', 'score': 95, 'reason': 'Specialized TypeScript expertise'},
                {'job': 'Frontend Developer', 'score': 90, 'reason': 'Modern frontend with type safety'},
                {'job': 'Software Engineer', 'score': 85, 'reason': 'Enterprise-level development'}
            ],
            'c#': [
                {'job': 'C# Developer', 'score': 95, 'reason': '.NET framework development'},
                {'job': '.NET Developer', 'score': 92, 'reason': 'Microsoft technology stack'},
                {'job': 'Software Engineer', 'score': 85, 'reason': 'Enterprise software development'}
            ],
            'php': [
                {'job': 'PHP Developer', 'score': 95, 'reason': 'PHP web development expertise'},
                {'job': 'Backend Developer', 'score': 90, 'reason': 'Server-side web development'},
                {'job': 'Web Developer', 'score': 85, 'reason': 'Dynamic web applications'}
            ],
            # Data & AI
            'machine learning': [
                {'job': 'Machine Learning Engineer', 'score': 95, 'reason': 'Direct ML model development'},
                {'job': 'Data Scientist', 'score': 90, 'reason': 'ML for data insights and predictions'},
                {'job': 'AI Engineer', 'score': 85, 'reason': 'Artificial intelligence applications'}
            ],
            'data science': [
                {'job': 'Data Scientist', 'score': 95, 'reason': 'Core data science expertise'},
                {'job': 'Data Analyst', 'score': 90, 'reason': 'Data analysis and insights'},
                {'job': 'Business Intelligence Analyst', 'score': 80, 'reason': 'Business-focused data analysis'}
            ],
            'sql': [
                {'job': 'Data Analyst', 'score': 90, 'reason': 'Database querying and analysis'},
                {'job': 'Database Administrator', 'score': 85, 'reason': 'Database management and optimization'},
                {'job': 'Backend Developer', 'score': 75, 'reason': 'Database integration in applications'}
            ],
            'tensorflow': [
                {'job': 'Machine Learning Engineer', 'score': 95, 'reason': 'TensorFlow ML framework expertise'},
                {'job': 'Deep Learning Engineer', 'score': 92, 'reason': 'Neural network development'},
                {'job': 'AI Research Scientist', 'score': 85, 'reason': 'AI research and development'}
            ],
            'pytorch': [
                {'job': 'Machine Learning Engineer', 'score': 95, 'reason': 'PyTorch deep learning framework'},
                {'job': 'Deep Learning Engineer', 'score': 92, 'reason': 'Advanced neural networks'},
                {'job': 'Research Scientist', 'score': 85, 'reason': 'ML research and experimentation'}
            ],
            # Cloud & DevOps
            'aws': [
                {'job': 'Cloud Engineer', 'score': 95, 'reason': 'AWS cloud platform expertise'},
                {'job': 'DevOps Engineer', 'score': 90, 'reason': 'Cloud infrastructure and deployment'},
                {'job': 'Cloud Architect', 'score': 85, 'reason': 'Cloud solution design'}
            ],
            'azure': [
                {'job': 'Cloud Engineer', 'score': 95, 'reason': 'Microsoft Azure cloud platform'},
                {'job': 'Azure Developer', 'score': 92, 'reason': 'Azure-specific development'},
                {'job': 'Cloud Architect', 'score': 85, 'reason': 'Azure solution architecture'}
            ],
            'docker': [
                {'job': 'DevOps Engineer', 'score': 90, 'reason': 'Containerization and deployment'},
                {'job': 'Cloud Engineer', 'score': 85, 'reason': 'Container orchestration'},
                {'job': 'Software Engineer', 'score': 75, 'reason': 'Modern development practices'}
            ],
            'kubernetes': [
                {'job': 'DevOps Engineer', 'score': 95, 'reason': 'Container orchestration expertise'},
                {'job': 'Cloud Engineer', 'score': 90, 'reason': 'Scalable cloud deployments'},
                {'job': 'Platform Engineer', 'score': 85, 'reason': 'Platform infrastructure management'}
            ],
            # Mobile Development
            'react native': [
                {'job': 'React Native Developer', 'score': 95, 'reason': 'Cross-platform mobile development'},
                {'job': 'Mobile Developer', 'score': 90, 'reason': 'Mobile app development'},
                {'job': 'Frontend Developer', 'score': 75, 'reason': 'React-based development'}
            ],
            'swift': [
                {'job': 'iOS Developer', 'score': 95, 'reason': 'Native iOS app development'},
                {'job': 'Mobile Developer', 'score': 90, 'reason': 'Apple ecosystem development'},
                {'job': 'App Developer', 'score': 85, 'reason': 'Mobile application development'}
            ],
            'kotlin': [
                {'job': 'Android Developer', 'score': 95, 'reason': 'Modern Android development'},
                {'job': 'Mobile Developer', 'score': 90, 'reason': 'Android app development'},
                {'job': 'Software Engineer', 'score': 75, 'reason': 'JVM-based development'}
            ],
            # Design & UX
            'figma': [
                {'job': 'UI/UX Designer', 'score': 95, 'reason': 'Modern design tool proficiency'},
                {'job': 'Product Designer', 'score': 90, 'reason': 'Digital product design'},
                {'job': 'Visual Designer', 'score': 85, 'reason': 'Interface and visual design'}
            ],
            'photoshop': [
                {'job': 'Graphic Designer', 'score': 95, 'reason': 'Professional image editing skills'},
                {'job': 'Visual Designer', 'score': 90, 'reason': 'Creative visual content'},
                {'job': 'UI Designer', 'score': 75, 'reason': 'User interface graphics'}
            ],
            'sketch': [
                {'job': 'UI/UX Designer', 'score': 92, 'reason': 'Interface design tool expertise'},
                {'job': 'Product Designer', 'score': 88, 'reason': 'Digital product interfaces'},
                {'job': 'Visual Designer', 'score': 80, 'reason': 'Visual design creation'}
            ],
            # Business & Management
            'project management': [
                {'job': 'Project Manager', 'score': 95, 'reason': 'Project planning and execution'},
                {'job': 'Program Manager', 'score': 90, 'reason': 'Multi-project coordination'},
                {'job': 'Scrum Master', 'score': 85, 'reason': 'Agile project management'}
            ],
            'business analysis': [
                {'job': 'Business Analyst', 'score': 95, 'reason': 'Requirements analysis and optimization'},
                {'job': 'Systems Analyst', 'score': 90, 'reason': 'System requirements and design'},
                {'job': 'Product Manager', 'score': 80, 'reason': 'Product strategy and analysis'}
            ],
            'digital marketing': [
                {'job': 'Digital Marketing Manager', 'score': 95, 'reason': 'Online marketing strategy'},
                {'job': 'Marketing Analyst', 'score': 88, 'reason': 'Marketing data analysis'},
                {'job': 'Content Marketing Manager', 'score': 82, 'reason': 'Digital content strategy'}
            ]
        }

    def _initialize_learning_paths(self):
        """Initialize learning paths for job roles"""
        self.learning_paths = {
            'Python Developer': {
                'core_skills': ['Python', 'Object-Oriented Programming', 'Data Structures'],
                'frameworks': ['Django', 'Flask', 'FastAPI'],
                'tools': ['Git', 'Docker', 'Testing (pytest)', 'Virtual Environments'],
                'databases': ['PostgreSQL', 'SQLite', 'Redis'],
                'additional': ['REST APIs', 'Code Documentation', 'Deployment']
            },
            'Frontend Developer': {
                'core_skills': ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
                'frameworks': ['React', 'Vue.js', 'Angular'],
                'tools': ['Webpack', 'NPM/Yarn', 'Git', 'Browser DevTools'],
                'styling': ['Sass/SCSS', 'Tailwind CSS', 'CSS Grid/Flexbox'],
                'additional': ['Performance Optimization', 'Accessibility', 'Testing']
            },
            'Data Scientist': {
                'core_skills': ['Python', 'Statistics', 'Machine Learning', 'Data Analysis'],
                'libraries': ['Pandas', 'NumPy', 'Scikit-learn', 'Matplotlib'],
                'tools': ['Jupyter Notebooks', 'Git', 'SQL', 'Excel'],
                'ml_frameworks': ['TensorFlow', 'PyTorch', 'XGBoost'],
                'additional': ['Data Visualization', 'Feature Engineering', 'Model Deployment']
            },
            'Machine Learning Engineer': {
                'core_skills': ['Machine Learning', 'Python', 'Statistics', 'Mathematics'],
                'frameworks': ['TensorFlow', 'PyTorch', 'Scikit-learn'],
                'tools': ['MLflow', 'Docker', 'Kubernetes', 'Git'],
                'cloud': ['AWS SageMaker', 'Google Cloud AI', 'Azure ML'],
                'additional': ['Model Optimization', 'Data Pipelines', 'Production Deployment']
            },
            'DevOps Engineer': {
                'core_skills': ['Linux', 'Networking', 'Scripting', 'System Administration'],
                'tools': ['Docker', 'Kubernetes', 'Jenkins', 'Git'],
                'cloud': ['AWS', 'Azure', 'Google Cloud'],
                'monitoring': ['Prometheus', 'Grafana', 'ELK Stack'],
                'additional': ['Infrastructure as Code', 'CI/CD', 'Security']
            },
            'Full Stack Developer': {
                'frontend': ['HTML', 'CSS', 'JavaScript', 'React/Vue/Angular'],
                'backend': ['Node.js/Python/Java', 'REST APIs', 'Databases'],
                'tools': ['Git', 'Docker', 'Testing Frameworks'],
                'databases': ['PostgreSQL', 'MongoDB', 'Redis'],
                'additional': ['Authentication', 'Deployment', 'Performance']
            },
            'UI/UX Designer': {
                'design_tools': ['Figma', 'Sketch', 'Adobe XD'],
                'skills': ['User Research', 'Wireframing', 'Prototyping'],
                'principles': ['Design Systems', 'Accessibility', 'Typography'],
                'testing': ['Usability Testing', 'A/B Testing'],
                'additional': ['HTML/CSS Basics', 'Design Thinking', 'Collaboration']
            },
            'Cloud Engineer': {
                'platforms': ['AWS', 'Azure', 'Google Cloud'],
                'core_skills': ['Networking', 'Security', 'Infrastructure'],
                'tools': ['Terraform', 'Docker', 'Kubernetes'],
                'monitoring': ['CloudWatch', 'Azure Monitor', 'Stackdriver'],
                'additional': ['Cost Optimization', 'Automation', 'Compliance']
            }
        }

    def get_keyword_specific_recommendations(self, keyword: str, context_skills: List[str] = None, top_k: int = 5) -> Dict[str, Any]:
        """Get job recommendations for a specific keyword with learning paths"""
        if not keyword:
            return {
                "success": False,
                "error": "No keyword provided",
                "source": "Keyword Specific Recommender"
            }

        # Use fallback if Gemini not available
        if not self.gemini_available:
            logger.info(f"Using fallback recommendations for keyword: {keyword}")
            return self._create_keyword_fallback(keyword, context_skills or [], top_k)

        try:
            # Create specialized prompt for single keyword
            prompt = self._create_keyword_prompt(keyword, context_skills)
            # Rate limiting
            self._rate_limit()
            # Generate recommendations
            logger.info(f"Requesting keyword-specific recommendations from Gemini for: {keyword}")
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=1500,
                )
            )

            if not response or not response.text:
                raise ValueError("Empty response from Gemini")

            # Parse JSON response
            cleaned_response = self._clean_json_response(response.text)
            try:
                recommendations = json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error: {e}. Response: {response.text[:200]}")
                raise

            # Format for consistent output with learning paths
            formatted = self._format_keyword_gemini_response(recommendations, keyword, context_skills or [], top_k)
            logger.info(f"Successfully generated keyword-specific recommendations for: {keyword}")
            return formatted

        except Exception as e:
            logger.error(f"Gemini API error for keyword '{keyword}': {e}")
            return self._create_keyword_fallback(keyword, context_skills or [], top_k, error=str(e))

    def _create_keyword_prompt(self, keyword: str, context_skills: List[str]) -> str:
        """Create a specialized prompt for keyword-specific job recommendations"""
        context_text = f" (context: {', '.join(context_skills[:3])})" if context_skills else ""
        return f"""You are an expert career counselor specializing in {keyword}. Analyze this specific skill and provide targeted job recommendations with learning paths.
PRIMARY SKILL: {keyword}{context_text}
Return ONLY a valid JSON object in this exact format:
{{
  "keyword_jobs": [
    {{
      "job": "Job Title 1",
      "score": 92,
      "reason": "Why this job matches the keyword",
      "required_skills": ["skill1", "skill2", "skill3"],
      "learning_path": {{
        "immediate": ["Learn this first", "Then this"],
        "intermediate": ["Next learn this", "And this"],
        "advanced": ["Finally master this", "Expert level skill"]
      }},
      "time_to_proficiency": "3-6 months",
      "difficulty": "Beginner/Intermediate/Advanced"
    }}
  ]
}}
Requirements:
- Focus specifically on jobs where {keyword} is a primary skill
- Provide 3-5 targeted job recommendations
- Include realistic learning paths with 2-3 items per level
- Estimate time to proficiency realistically
- Consider current job market demand for {keyword}
- Keep explanations under 20 words"""

    def _format_keyword_gemini_response(self, gemini_data: Dict, keyword: str, context_skills: List[str], top_k: int) -> Dict[str, Any]:
        """Format Gemini response for keyword-specific recommendations"""
        job_recommendations = []
        keyword_jobs = gemini_data.get("keyword_jobs", [])
        for i, job_data in enumerate(keyword_jobs):
            # Enhanced job recommendation with learning path
            job_recommendation = {
                "title": job_data.get("job", "Unknown Job"),
                "description": job_data.get("reason", "AI-recommended position based on keyword match"),
                "related_skill": keyword,
                "relevance_score": job_data.get("score", 85) / 100.0,
                "rank": i + 1,
                "required_skills": job_data.get("required_skills", [keyword]),
                "skill_gaps": [],
                "sector": self._determine_job_sector(job_data.get("job", "")),
                "source": "Google Gemini",
                "learning_path": job_data.get("learning_path", {}),
                "time_to_proficiency": job_data.get("time_to_proficiency", "3-6 months"),
                "difficulty": job_data.get("difficulty", "Intermediate"),
                "keyword_focus": keyword
            }
            # Add skill gaps based on required skills vs current skills
            current_skills_lower = [skill.lower() for skill in context_skills]
            required_skills = job_data.get("required_skills", [])
            skill_gaps = [skill for skill in required_skills if skill.lower() not in current_skills_lower]
            job_recommendation["skill_gaps"] = skill_gaps[:5]  # Limit to 5 gaps
            job_recommendations.append(job_recommendation)

        # Limit results
        limited_jobs = job_recommendations[:top_k]

        # Group by sector
        jobs_by_sector = {}
        for job in limited_jobs:
            sector = job["sector"]
            if sector not in jobs_by_sector:
                jobs_by_sector[sector] = []
            jobs_by_sector[sector].append(job)

        return {
            "success": True,
            "job_recommendations": limited_jobs,
            "jobs_by_sector": jobs_by_sector,
            "total_jobs_found": len(job_recommendations),
            "unique_jobs": len(set(job["title"] for job in job_recommendations)),
            "sectors_found": list(jobs_by_sector.keys()),
            "source": "Google Gemini API",
            "primary_source": "Google Gemini (Keyword-Specific)",
            "target_keyword": keyword,
            "context_skills": context_skills,
            "gemini_available": True,
            "analysis_type": "keyword_specific"
        }

    def _create_keyword_fallback(self, keyword: str, context_skills: List[str], top_k: int = 5, error: str = None) -> Dict[str, Any]:
        """Create fallback recommendations for a specific keyword"""
        logger.info(f"Creating keyword-specific fallback for: {keyword}")
        job_recommendations = []
        keyword_lower = keyword.lower().strip()

        # Find direct matches first
        jobs_data = []
        for key, job_list in self.skill_job_mappings.items():
            if key == keyword_lower or keyword_lower in key or key in keyword_lower:
                jobs_data = job_list
                break

        # If no direct match, try partial matches
        if not jobs_data:
            for key, job_list in self.skill_job_mappings.items():
                if any(word in keyword_lower for word in key.split()) or any(word in key for word in keyword_lower.split()):
                    jobs_data = job_list
                    break

        # Default jobs if no match
        if not jobs_data:
            jobs_data = self._generate_generic_jobs(keyword)

        # Create detailed job recommendations
        for i, job_data in enumerate(jobs_data[:top_k]):
            job_title = job_data['job']
            # Get learning path from our database
            learning_path = self.learning_paths.get(job_title, self._generate_learning_path(job_title, keyword))

            # Calculate skill gaps
            current_skills_lower = [skill.lower() for skill in context_skills]
            all_required = []
            for category in learning_path.values():
                if isinstance(category, list):
                    all_required.extend(category)
            skill_gaps = [skill for skill in all_required if skill.lower() not in current_skills_lower][:5]

            job_recommendations.append({
                "title": job_title,
                "description": job_data['reason'],
                "related_skill": keyword,
                "relevance_score": job_data['score'] / 100.0,
                "rank": i + 1,
                "required_skills": [keyword] + all_required[:4],
                "skill_gaps": skill_gaps,
                "sector": self._determine_job_sector(job_title),
                "source": "Built-in Fallback",
                "learning_path": learning_path,
                "time_to_proficiency": self._estimate_learning_time(job_title, keyword),
                "difficulty": self._assess_difficulty(job_title, keyword),
                "keyword_focus": keyword
            })

        # Group by sector
        jobs_by_sector = {}
        for job in job_recommendations:
            sector = job["sector"]
            if sector not in jobs_by_sector:
                jobs_by_sector[sector] = []
            jobs_by_sector[sector].append(job)

        return {
            "success": True,
            "job_recommendations": job_recommendations,
            "jobs_by_sector": jobs_by_sector,
            "total_jobs_found": len(job_recommendations),
            "unique_jobs": len(job_recommendations),
            "sectors_found": list(jobs_by_sector.keys()),
            "source": "Built-in Fallback",
            "primary_source": "Built-in Keyword Mapping",
            "target_keyword": keyword,
            "context_skills": context_skills,
            "note": "Generated using built-in keyword mappings with learning paths",
            "gemini_available": self.gemini_available,
            "error": error,
            "analysis_type": "keyword_specific"
        }

    def _generate_learning_path(self, job_title: str, keyword: str) -> Dict[str, List[str]]:
        """Generate a learning path for jobs not in our database"""
        job_lower = job_title.lower()
        if 'developer' in job_lower or 'engineer' in job_lower:
            return {
                'foundations': [keyword, 'Version Control (Git)', 'Problem Solving'],
                'intermediate': ['Framework/Library', 'Database Basics', 'Testing'],
                'advanced': ['System Design', 'Performance Optimization', 'Deployment']
            }
        elif 'analyst' in job_lower:
            return {
                'foundations': [keyword, 'Data Analysis', 'Excel/Spreadsheets'],
                'intermediate': ['SQL', 'Data Visualization', 'Statistics'],
                'advanced': ['Advanced Analytics', 'Reporting', 'Domain Expertise']
            }
        elif 'designer' in job_lower:
            return {
                'foundations': [keyword, 'Design Principles', 'Color Theory'],
                'intermediate': ['Prototyping', 'User Research', 'Design Tools'],
                'advanced': ['Design Systems', 'Accessibility', 'Collaboration']
            }
        else:
            return {
                'foundations': [keyword, 'Industry Knowledge', 'Communication'],
                'intermediate': ['Specialized Tools', 'Process Understanding', 'Collaboration'],
                'advanced': ['Leadership', 'Strategic Thinking', 'Innovation']
            }

    def _estimate_learning_time(self, job_title: str, keyword: str) -> str:
        """Estimate time to become proficient in a role"""
        job_lower = job_title.lower()
        if any(word in job_lower for word in ['senior', 'lead', 'architect', 'principal']):
            return "2-3 years"
        elif any(word in job_lower for word in ['engineer', 'scientist', 'specialist']):
            return "6-12 months"
        elif any(word in job_lower for word in ['developer', 'analyst']):
            return "3-6 months"
        else:
            return "3-9 months"

    def _assess_difficulty(self, job_title: str, keyword: str) -> str:
        """Assess the difficulty level of transitioning to this role"""
        job_lower = job_title.lower()
        if any(word in job_lower for word in ['senior', 'lead', 'architect', 'principal']):
            return "Advanced"
        elif any(word in job_lower for word in ['machine learning', 'ai', 'data scientist']):
            return "Advanced"
        elif any(word in job_lower for word in ['developer', 'engineer']):
            return "Intermediate"
        else:
            return "Beginner"

    # --- Original Methods (for general skill-based recommendations) ---

    def _rate_limit(self):
        """Implement thread-safe rate limiting"""
        if not self.gemini_available:
            return
        with self._rate_limit_lock:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                time.sleep(sleep_time)
            self.last_request_time = time.time()

    def _create_job_prompt(self, skills: List[str]) -> str:
        """Create a structured prompt for job recommendations"""
        skills_text = ", ".join(skills[:8])
        return f"""You are an expert career counselor. Analyze these skills and provide job recommendations:
SKILLS: {skills_text}
Return ONLY a valid JSON object in this exact format:
{{
  "overall_top_jobs": [
    {{"job": "Job Title 1", "skills": ["skill1", "skill2"], "score": 92, "reason": "Brief explanation"}},
    {{"job": "Job Title 2", "skills": ["skill3"], "score": 88, "reason": "Brief explanation"}},
    {{"job": "Job Title 3", "skills": ["skill1"], "score": 84, "reason": "Brief explanation"}}
  ]
}}
Requirements:
- Provide exactly 3-5 job recommendations
- Use realistic job titles from 2024 job market  
- Scores should be 70-95 (higher = better match)
- Keep explanations under 15 words
- Consider skill combinations
- Focus on achievable positions"""

    def get_job_recommendations(self, skills: List[str], context: str = None, top_k: int = 10) -> Dict[str, Any]:
        """Get job recommendations for skills using Gemini API with fallback"""
        if not skills:
            return {
                "success": False,
                "error": "No skills provided",
                "source": "Gemini-Only Recommender"
            }

        # Use fallback if Gemini not available
        if not self.gemini_available:
            logger.info("Using fallback recommendations - Gemini not available")
            return self._create_comprehensive_fallback(skills, top_k)

        try:
            # Create prompt
            prompt = self._create_job_prompt(skills)
            if context:
                prompt += f"\nAdditional context: {context[:200]}"

            # Rate limiting
            self._rate_limit()

            # Generate recommendations
            logger.info(f"Requesting job recommendations from Gemini for {len(skills)} skills")
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=1024,
                )
            )

            if not response or not response.text:
                raise ValueError("Empty response from Gemini")

            # Parse JSON response
            cleaned_response = self._clean_json_response(response.text)
            try:
                recommendations = json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error: {e}. Response: {response.text[:200]}")
                raise

            # Format for consistent output
            formatted = self._format_gemini_response(recommendations, skills, top_k)
            logger.info(f"Successfully generated Gemini recommendations for {len(skills)} skills")
            return formatted

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return self._create_comprehensive_fallback(skills, top_k, error=str(e))

    def _clean_json_response(self, response_text: str) -> str:
        """Clean and extract JSON from Gemini response"""
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        response_text = response_text.strip()
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            return json_match.group(0)
        return response_text

    def _format_gemini_response(self, gemini_data: Dict, original_skills: List[str], top_k: int) -> Dict[str, Any]:
        """Format Gemini response to match expected output structure"""
        job_recommendations = []
        # Process overall top jobs
        overall_jobs = gemini_data.get("overall_top_jobs", [])
        for i, job_data in enumerate(overall_jobs):
            job_recommendations.append({
                "title": job_data.get("job", "Unknown Job"),
                "description": job_data.get("reason", "AI-recommended position based on skill match"),
                "related_skill": "Multiple Skills",
                "relevance_score": job_data.get("score", 85) / 100.0,
                "rank": i + 1,
                "required_skills": job_data.get("skills", original_skills[:3]),
                "skill_gaps": [],
                "sector": self._determine_job_sector(job_data.get("job", "")),
                "source": "Google Gemini"
            })

        # Limit results
        limited_jobs = job_recommendations[:top_k]

        # Group by sector
        jobs_by_sector = {}
        for job in limited_jobs:
            sector = job["sector"]
            if sector not in jobs_by_sector:
                jobs_by_sector[sector] = []
            jobs_by_sector[sector].append(job)

        return {
            "success": True,
            "job_recommendations": limited_jobs,
            "jobs_by_sector": jobs_by_sector,
            "total_jobs_found": len(job_recommendations),
            "unique_jobs": len(set(job["title"] for job in job_recommendations)),
            "sectors_found": list(jobs_by_sector.keys()),
            "source": "Google Gemini API",
            "primary_source": "Google Gemini",
            "skills_analyzed": original_skills,
            "gemini_available": True
        }

    def _create_comprehensive_fallback(self, skills: List[str], top_k: int = 10, error: str = None) -> Dict[str, Any]:
        """Create comprehensive fallback recommendations when Gemini is unavailable"""
        logger.info(f"Creating comprehensive fallback recommendations for {len(skills)} skills")
        job_recommendations = []

        # Generate recommendations for each skill
        for skill in skills[:6]:
            skill_lower = skill.lower().strip()
            jobs_data = []
            # Find matching jobs from our comprehensive mapping
            for key, job_list in self.skill_job_mappings.items():
                if key in skill_lower or any(word in skill_lower for word in key.split()):
                    jobs_data = job_list
                    break

            # Default jobs if no specific match
            if not jobs_data:
                jobs_data = self._generate_generic_jobs(skill)

            # Create job recommendations for this skill
            for job_data in jobs_data[:2]:
                job_recommendations.append({
                    "title": job_data['job'],
                    "description": job_data['reason'],
                    "related_skill": skill,
                    "relevance_score": job_data['score'] / 100.0,
                    "rank": jobs_data.index(job_data) + 1,
                    "required_skills": [skill],
                    "skill_gaps": [],
                    "sector": self._determine_job_sector(job_data['job']),
                    "source": "Comprehensive Fallback"
                })

        # Add combination jobs
        combination_jobs = self._generate_combination_jobs(skills[:4])
        job_recommendations.extend(combination_jobs)

        # Remove duplicates and sort
        seen_jobs = set()
        unique_jobs = []
        for job in job_recommendations:
            if job["title"] not in seen_jobs:
                seen_jobs.add(job["title"])
                unique_jobs.append(job)

        unique_jobs.sort(key=lambda x: x["relevance_score"], reverse=True)
        limited_jobs = unique_jobs[:top_k]

        # Group by sector
        jobs_by_sector = {}
        for job in limited_jobs:
            sector = job["sector"]
            if sector not in jobs_by_sector:
                jobs_by_sector[sector] = []
            jobs_by_sector[sector].append(job)

        return {
            "success": True,
            "job_recommendations": limited_jobs,
            "jobs_by_sector": jobs_by_sector,
            "total_jobs_found": len(unique_jobs),
            "unique_jobs": len(unique_jobs),
            "sectors_found": list(jobs_by_sector.keys()),
            "source": "Comprehensive Fallback",
            "primary_source": "Built-in Fallback Mapping",
            "skills_analyzed": skills,
            "note": "Generated using comprehensive built-in mappings",
            "gemini_available": self.gemini_available,
            "error": error
        }

    def _generate_generic_jobs(self, skill: str) -> List[Dict]:
        """Generate generic job recommendations for unrecognized skills"""
        skill_lower = skill.lower()
        if any(word in skill_lower for word in ['programming', 'coding', 'development', 'developer']):
            return [
                {'job': 'Software Developer', 'score': 85, 'reason': 'General software development position'},
                {'job': 'Software Engineer', 'score': 80, 'reason': 'Engineering-focused development role'}
            ]
        elif any(word in skill_lower for word in ['data', 'analysis', 'analytics']):
            return [
                {'job': 'Data Analyst', 'score': 85, 'reason': 'Data analysis and insights'},
                {'job': 'Business Analyst', 'score': 80, 'reason': 'Business-focused analysis'}
            ]
        else:
            return [
                {'job': f'{skill} Specialist', 'score': 80, 'reason': f'Specialized role requiring {skill} expertise'},
                {'job': f'{skill} Consultant', 'score': 75, 'reason': f'Consulting role in {skill} domain'}
            ]

    def _generate_combination_jobs(self, skills: List[str]) -> List[Dict]:
        """Generate jobs that combine multiple skills"""
        combination_jobs = []
        skill_set = set(skill.lower() for skill in skills)

        # Frontend combinations
        if any(frontend in skill_set for frontend in ['react', 'javascript', 'html', 'css']):
            combination_jobs.append({
                "title": "Frontend Developer",
                "description": "Combines multiple frontend technologies",
                "related_skill": "Multiple Skills",
                "relevance_score": 0.88,
                "rank": 1,
                "required_skills": [skill for skill in skills if skill.lower() in ['react', 'javascript', 'html', 'css']][:3],
                "skill_gaps": [],
                "sector": "Technology",
                "source": "Skill Combination"
            })

        # Full-stack combinations
        if (any(frontend in skill_set for frontend in ['react', 'javascript']) and 
            any(backend in skill_set for backend in ['python', 'node.js', 'java'])):
            combination_jobs.append({
                "title": "Full Stack Developer",
                "description": "Combines frontend and backend skills",
                "related_skill": "Multiple Skills",
                "relevance_score": 0.92,
                "rank": 1,
                "required_skills": skills[:3],
                "skill_gaps": [],
                "sector": "Technology",
                "source": "Skill Combination"
            })

        return combination_jobs

    def _determine_job_sector(self, job_title: str) -> str:
        """Determine sector based on job title"""
        job_lower = job_title.lower()
        if any(word in job_lower for word in ['developer', 'engineer', 'programmer', 'software']):
            return 'Technology'
        elif any(word in job_lower for word in ['data', 'scientist', 'analyst', 'machine learning', 'ai']):
            return 'Data Science'
        elif any(word in job_lower for word in ['designer', 'ux', 'ui', 'creative']):
            return 'Design'
        elif any(word in job_lower for word in ['manager', 'director', 'lead']):
            return 'Management'
        elif any(word in job_lower for word in ['cloud', 'devops', 'infrastructure']):
            return 'Cloud & DevOps'
        else:
            return 'Other'