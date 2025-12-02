import { useState, useEffect } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs'; // Import từ @stomp/stompjs

const CommentSection = () => {
  const postId = "6833f2db6353fe4e3b54825d";
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [userId] = useState('a6c759c4-0ae1-4321-9d5c-d4ae7c298cae');
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    fetchComments();
    connectWebSocket();
    return () => disconnectWebSocket();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`http://localhost:8082/community-service/comments/${postId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách bình luận:', error);
    }
  };

  const connectWebSocket = () => {
    const socket = new SockJS('http://localhost:8082/community-service/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (msg) => console.log('STOMP Debug:', msg), // Debug chi tiết
      reconnectDelay: 5000, // Tự động thử lại sau 5 giây nếu mất kết nối
    });

    client.onConnect = () => {
      console.log('Đã kết nối WebSocket');
      client.subscribe(`/topic/comments/${postId}`, (message) => {
        console.log('Nhận tin nhắn WebSocket:', message.body);
        const newComment = JSON.parse(message.body);
        if (newComment && newComment.id) {
          setComments((prev) => [newComment, ...prev.filter((c) => c.id !== newComment.id)]);
        }
      });
    };

    client.onStompError = (error) => {
      console.error('Lỗi kết nối WebSocket:', error);
    };

    client.activate(); // Kích hoạt kết nối
    setStompClient(client);
  };

  const disconnectWebSocket = () => {
    if (stompClient) {
      stompClient.deactivate(() => console.log('Đã ngắt kết nối WebSocket'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      const commentRequest = { postId, content, userId };
      await axios.post('http://localhost:8082/community-service/comments', commentRequest);
      setContent('');
    } catch (error) {
      console.error('Lỗi khi gửi bình luận:', error);
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="comment-section">
      <h2>Bình luận cho bài viết {postId}</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Viết bình luận..."
          rows="4"
          cols="50"
        />
        <br />
        <button type="submit">Gửi bình luận</button>
      </form>
      <div className="comments-list">
        {comments.length === 0 ? (
          <p>Chưa có bình luận.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <p>
                <strong>{comment.userName}</strong> ({formatDateTime(comment.createdAt)}):
              </p>
              <p>{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;