// Skill taxonomy + alias resolution — the controlled vocabulary the whole system depends on.
'use strict';

// canonical, category, aliases, demand index (100 = baseline), salary premium %, growth %, emerging, decay(yrs)
const SKILLS = [
  ['Python', 'language', ['python3', 'py', 'python 3'], 96, 6, 3, 0, 12],
  ['TypeScript', 'language', ['ts', 'typescript 5'], 91, 9, 14, 0, 10],
  ['JavaScript', 'language', ['js', 'ecmascript'], 88, 3, -4, 0, 8],
  ['SQL', 'language', ['postgres', 'postgresql', 'mysql', 'sql server', 't-sql'], 90, 2, 2, 0, 20],
  ['Go', 'language', ['golang'], 74, 14, 9, 0, 10],
  ['Rust', 'language', ['rustlang'], 58, 22, 18, 1, 10],
  ['Flutter', 'framework', ['dart', 'flutter 3'], 61, 5, 4, 0, 8],
  ['React', 'framework', ['reactjs', 'react.js', 'next.js', 'nextjs'], 89, 5, 6, 0, 8],
  ['Node.js', 'framework', ['node', 'nodejs', 'express', 'nestjs'], 84, 4, 3, 0, 9],
  ['Django', 'framework', ['django rest', 'drf'], 63, 4, -2, 0, 9],
  ['FastAPI', 'framework', ['fast api'], 68, 7, 22, 0, 9],
  ['PyTorch', 'framework', ['torch', 'pytorch lightning'], 79, 16, 20, 0, 7],
  ['TensorFlow', 'framework', ['tf', 'keras'], 70, 9, -6, 0, 6],
  ['scikit-learn', 'framework', ['sklearn', 'scikit learn'], 72, 5, -2, 0, 8],
  ['Spark', 'framework', ['pyspark', 'apache spark'], 66, 8, 1, 0, 9],
  ['dbt', 'tool', ['data build tool'], 58, 11, 24, 0, 8],
  ['Airflow', 'tool', ['apache airflow', 'dagster', 'prefect'], 64, 8, 12, 0, 9],
  ['Docker', 'tool', ['containers', 'containerization'], 86, 5, 4, 0, 12],
  ['Kubernetes', 'tool', ['k8s', 'eks', 'gke'], 76, 15, 8, 0, 10],
  ['Terraform', 'tool', ['iac', 'infrastructure as code', 'opentofu'], 67, 13, 11, 0, 10],
  ['AWS', 'cloud', ['amazon web services', 'ec2', 's3', 'lambda', 'sagemaker'], 88, 12, 7, 0, 10],
  ['GCP', 'cloud', ['google cloud', 'bigquery', 'vertex ai'], 71, 10, 12, 0, 10],
  ['Azure', 'cloud', ['microsoft azure', 'azure ml'], 69, 6, 6, 0, 10],
  ['MLOps', 'domain', ['ml ops', 'model ops', 'ml platform'], 63, 21, 28, 1, 8],
  ['LLMOps', 'domain', ['llm ops', 'genai ops', 'prompt ops'], 41, 29, 62, 1, 7],
  ['RAG', 'domain', ['retrieval augmented generation', 'vector search', 'embeddings', 'pgvector', 'pinecone'], 52, 24, 71, 1, 7],
  ['Fine-tuning', 'domain', ['finetuning', 'lora', 'peft', 'rlhf'], 44, 27, 58, 1, 7],
  ['Prompt Engineering', 'domain', ['prompting', 'prompt design'], 66, 14, 44, 1, 6],
  ['Data Modelling', 'domain', ['dimensional modelling', 'star schema', 'data modeling'], 62, 7, 3, 0, 15],
  ['Experimentation', 'domain', ['a/b testing', 'ab testing', 'causal inference'], 55, 12, 15, 0, 10],
  ['Statistics', 'domain', ['statistical analysis', 'bayesian', 'regression'], 64, 8, 2, 0, 20],
  ['Machine Learning', 'domain', ['ml', 'deep learning', 'supervised learning'], 82, 14, 9, 0, 9],
  ['NLP', 'domain', ['natural language processing', 'text mining'], 67, 15, 21, 0, 8],
  ['Computer Vision', 'domain', ['cv', 'opencv', 'image recognition'], 54, 13, 7, 0, 8],
  ['Data Engineering', 'domain', ['etl', 'elt', 'data pipelines', 'ingestion'], 74, 12, 16, 0, 10],
  ['Analytics Engineering', 'domain', ['analytics engineer'], 57, 10, 19, 0, 10],
  ['Product Analytics', 'domain', ['amplitude', 'mixpanel', 'posthog', 'product metrics'], 58, 7, 11, 0, 10],
  ['System Design', 'domain', ['architecture', 'distributed systems', 'scalability'], 76, 16, 6, 0, 12],
  ['Microservices', 'domain', ['service oriented architecture', 'soa'], 62, 6, -3, 0, 10],
  ['GraphQL', 'framework', ['gql', 'apollo'], 59, 6, -1, 0, 8],
  ['gRPC', 'framework', ['protobuf', 'protocol buffers'], 48, 9, 5, 0, 9],
  ['CI/CD', 'tool', ['cicd', 'github actions', 'gitlab ci', 'jenkins', 'continuous integration'], 79, 6, 5, 0, 12],
  ['Testing', 'practice', ['unit testing', 'jest', 'pytest', 'playwright', 'cypress', 'tdd'], 71, 3, 3, 0, 15],
  ['Security Engineering', 'domain', ['appsec', 'application security', 'threat modelling', 'soc2'], 65, 18, 14, 0, 10],
  ['Observability', 'tool', ['datadog', 'grafana', 'prometheus', 'opentelemetry', 'monitoring'], 60, 10, 13, 0, 10],
  ['Kafka', 'tool', ['event streaming', 'event driven', 'pubsub'], 58, 11, 8, 0, 10],
  ['Redis', 'tool', ['caching', 'in-memory store'], 55, 4, 1, 0, 12],
  ['Mobile Engineering', 'domain', ['ios', 'android', 'swift', 'kotlin', 'react native'], 68, 6, 2, 0, 9],
  ['Design Systems', 'practice', ['figma', 'component library', 'ui kit'], 52, 3, 5, 0, 10],
  ['Product Management', 'practice', ['pm', 'product owner', 'roadmapping'], 64, 5, 4, 0, 12],
  ['Technical Writing', 'practice', ['documentation', 'docs'], 46, 2, 9, 0, 15],
  ['Communication', 'soft', ['stakeholder management', 'presentation', 'written communication'], 83, 3, 4, 0, 30],
  ['Leadership', 'soft', ['team lead', 'people management', 'mentoring'], 72, 11, 6, 0, 25],
  ['Negotiation', 'soft', ['deal making', 'contract negotiation'], 49, 9, 7, 0, 25],
  ['German', 'language-spoken', ['deutsch'], 34, 8, 4, 0, 40],
  ['English', 'language-spoken', ['fluent english'], 92, 4, 1, 0, 40],
  ['Spanish', 'language-spoken', ['espanol'], 38, 2, 3, 0, 40],
  ['Portuguese', 'language-spoken', ['portugues'], 31, 2, 3, 0, 40],
];

const ALIAS_MAP = new Map();
for (const [canonical, , aliases] of SKILLS) {
  ALIAS_MAP.set(canonical.toLowerCase(), canonical);
  for (const a of aliases) ALIAS_MAP.set(a.toLowerCase(), canonical);
}

function resolveSkill(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim().replace(/[._]/g, (m) => m).replace(/\s+/g, ' ');
  return ALIAS_MAP.get(key) || ALIAS_MAP.get(key.replace(/[.]/g, '')) || null;
}

module.exports = { SKILLS, ALIAS_MAP, resolveSkill };
