"""
知识库管理服务
"""
import json
import os
import hashlib
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import jieba

from agent.models.schemas import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseResponse,
    DocumentUpload, DocumentResponse, KnowledgeQuery, KnowledgeResult
)


class KnowledgeService:
    """知识库管理服务"""
    
    def __init__(self):
        # 模拟数据存储（实际项目中应使用向量数据库）
        self.knowledge_bases = {}
        self.documents = {}
        self.chunks = {}
        # 简单的TF-IDF向量化器（实际项目中应使用专业的embedding模型）
        self.vectorizer = TfidfVectorizer(max_features=1000)
        self.chunk_vectors = {}
        self._ensure_data_directory()
    
    def _ensure_data_directory(self):
        """确保数据目录存在"""
        os.makedirs("agent/data/documents", exist_ok=True)
        os.makedirs("agent/data/vectors", exist_ok=True)
    
    def _split_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """文本分块"""
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + chunk_size
            if end > text_length:
                end = text_length
            
            chunk = text[start:end]
            chunks.append(chunk)
            
            if end == text_length:
                break
            
            start = end - chunk_overlap
        
        return chunks
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        # 使用jieba进行中文分词
        words = jieba.lcut(text)
        # 过滤停用词和标点符号
        keywords = [word for word in words if len(word) > 1 and word.isalnum()]
        return keywords[:10]  # 返回前10个关键词
    
    def _vectorize_text(self, text: str) -> List[float]:
        """文本向量化（简化实现）"""
        # 实际项目中应使用OpenAI embedding或其他专业模型
        words = jieba.lcut(text)
        word_hash = hashlib.md5(' '.join(words).encode()).hexdigest()
        # 生成一个固定长度的伪向量
        np.random.seed(int(word_hash[:8], 16))
        return np.random.random(384).tolist()
    
    async def create_knowledge_base(self, user_id: str, data: KnowledgeBaseCreate) -> KnowledgeBaseResponse:
        """创建知识库"""
        kb_id = str(uuid4())
        
        kb_data = {
            "id": kb_id,
            "user_id": user_id,
            "name": data.name,
            "description": data.description,
            "embedding_model": data.embedding_model,
            "vector_dimension": 384,  # 固定维度
            "chunk_size": data.chunk_size,
            "chunk_overlap": data.chunk_overlap,
            "document_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.knowledge_bases[kb_id] = kb_data
        return KnowledgeBaseResponse(**kb_data)
    
    async def get_knowledge_bases(self, user_id: str) -> List[KnowledgeBaseResponse]:
        """获取用户的知识库列表"""
        user_kbs = []
        for kb_data in self.knowledge_bases.values():
            if kb_data["user_id"] == user_id:
                user_kbs.append(KnowledgeBaseResponse(**kb_data))
        return user_kbs
    
    async def get_knowledge_base(self, user_id: str, kb_id: str) -> Optional[KnowledgeBaseResponse]:
        """获取指定知识库"""
        kb_data = self.knowledge_bases.get(kb_id)
        if kb_data and kb_data["user_id"] == user_id:
            return KnowledgeBaseResponse(**kb_data)
        return None
    
    async def update_knowledge_base(self, user_id: str, kb_id: str, data: KnowledgeBaseUpdate) -> Optional[KnowledgeBaseResponse]:
        """更新知识库"""
        kb_data = self.knowledge_bases.get(kb_id)
        if not kb_data or kb_data["user_id"] != user_id:
            return None
        
        if data.name is not None:
            kb_data["name"] = data.name
        if data.description is not None:
            kb_data["description"] = data.description
        if data.embedding_model is not None:
            kb_data["embedding_model"] = data.embedding_model
        if data.chunk_size is not None:
            kb_data["chunk_size"] = data.chunk_size
        if data.chunk_overlap is not None:
            kb_data["chunk_overlap"] = data.chunk_overlap
        if data.is_active is not None:
            kb_data["is_active"] = data.is_active
        
        kb_data["updated_at"] = datetime.utcnow()
        return KnowledgeBaseResponse(**kb_data)
    
    async def delete_knowledge_base(self, user_id: str, kb_id: str) -> bool:
        """删除知识库"""
        kb_data = self.knowledge_bases.get(kb_id)
        if kb_data and kb_data["user_id"] == user_id:
            # 删除相关文档和分块
            docs_to_delete = [doc_id for doc_id, doc_data in self.documents.items() 
                             if doc_data["knowledge_base_id"] == kb_id]
            for doc_id in docs_to_delete:
                await self.delete_document(user_id, doc_id)
            
            del self.knowledge_bases[kb_id]
            return True
        return False
    
    async def upload_document(self, user_id: str, kb_id: str, data: DocumentUpload) -> Optional[DocumentResponse]:
        """上传文档到知识库"""
        kb_data = self.knowledge_bases.get(kb_id)
        if not kb_data or kb_data["user_id"] != user_id:
            return None
        
        doc_id = str(uuid4())
        
        # 保存文档内容到文件
        file_path = f"agent/data/documents/{doc_id}.txt"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(data.content)
        
        doc_data = {
            "id": doc_id,
            "knowledge_base_id": kb_id,
            "filename": data.filename,
            "file_type": data.file_type,
            "file_size": len(data.content.encode('utf-8')),
            "file_path": file_path,
            "content": data.content,
            "metadata": data.metadata or {},
            "chunk_count": 0,
            "processed": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.documents[doc_id] = doc_data
        
        # 异步处理文档分块和向量化
        await self._process_document(doc_id)
        
        # 更新知识库文档计数
        kb_data["document_count"] += 1
        
        return DocumentResponse(**doc_data)
    
    async def _process_document(self, doc_id: str):
        """处理文档：分块和向量化"""
        doc_data = self.documents.get(doc_id)
        if not doc_data:
            return
        
        kb_id = doc_data["knowledge_base_id"]
        kb_data = self.knowledge_bases.get(kb_id)
        if not kb_data:
            return
        
        # 文档分块
        chunks = self._split_text(
            doc_data["content"],
            kb_data["chunk_size"],
            kb_data["chunk_overlap"]
        )
        
        # 为每个分块生成向量
        for i, chunk_content in enumerate(chunks):
            chunk_id = f"{doc_id}_{i}"
            
            chunk_data = {
                "id": chunk_id,
                "document_id": doc_id,
                "chunk_index": i,
                "content": chunk_content,
                "embedding": self._vectorize_text(chunk_content),
                "metadata": {
                    "keywords": self._extract_keywords(chunk_content),
                    "length": len(chunk_content)
                },
                "created_at": datetime.utcnow()
            }
            
            self.chunks[chunk_id] = chunk_data
        
        # 更新文档状态
        doc_data["chunk_count"] = len(chunks)
        doc_data["processed"] = True
        doc_data["updated_at"] = datetime.utcnow()
    
    async def get_documents(self, user_id: str, kb_id: str) -> List[DocumentResponse]:
        """获取知识库的文档列表"""
        kb_data = self.knowledge_bases.get(kb_id)
        if not kb_data or kb_data["user_id"] != user_id:
            return []
        
        docs = []
        for doc_data in self.documents.values():
            if doc_data["knowledge_base_id"] == kb_id:
                docs.append(DocumentResponse(**doc_data))
        return docs
    
    async def delete_document(self, user_id: str, doc_id: str) -> bool:
        """删除文档"""
        doc_data = self.documents.get(doc_id)
        if not doc_data:
            return False
        
        kb_data = self.knowledge_bases.get(doc_data["knowledge_base_id"])
        if not kb_data or kb_data["user_id"] != user_id:
            return False
        
        # 删除文件
        if os.path.exists(doc_data["file_path"]):
            os.remove(doc_data["file_path"])
        
        # 删除相关分块
        chunks_to_delete = [chunk_id for chunk_id, chunk_data in self.chunks.items() 
                           if chunk_data["document_id"] == doc_id]
        for chunk_id in chunks_to_delete:
            del self.chunks[chunk_id]
        
        # 删除文档记录
        del self.documents[doc_id]
        
        # 更新知识库文档计数
        kb_data["document_count"] -= 1
        
        return True
    
    async def query_knowledge_base(self, user_id: str, kb_id: str, query: KnowledgeQuery) -> List[KnowledgeResult]:
        """查询知识库"""
        kb_data = self.knowledge_bases.get(kb_id)
        if not kb_data or kb_data["user_id"] != user_id:
            return []
        
        # 对查询文本进行向量化
        query_vector = self._vectorize_text(query.query)
        
        # 计算与所有分块的相似度
        results = []
        for chunk_id, chunk_data in self.chunks.items():
            doc_data = self.documents.get(chunk_data["document_id"])
            if doc_data and doc_data["knowledge_base_id"] == kb_id:
                # 计算余弦相似度
                chunk_vector = chunk_data["embedding"]
                similarity = self._cosine_similarity(query_vector, chunk_vector)
                
                if similarity >= query.score_threshold:
                    results.append(KnowledgeResult(
                        content=chunk_data["content"],
                        score=similarity,
                        metadata=chunk_data["metadata"],
                        document_id=chunk_data["document_id"],
                        chunk_index=chunk_data["chunk_index"]
                    ))
        
        # 按相似度排序并返回前K个结果
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:query.top_k]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """计算余弦相似度"""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
