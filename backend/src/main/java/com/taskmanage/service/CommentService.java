package com.taskmanage.service;

import com.taskmanage.dto.CommentDTO;
import com.taskmanage.dto.UserDTO;
import com.taskmanage.model.Comment;
import com.taskmanage.model.Task;
import com.taskmanage.model.User;
import com.taskmanage.repository.CommentRepository;
import com.taskmanage.repository.TaskRepository;
import com.taskmanage.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;
    
    @Autowired
    private TaskRepository taskRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private NotificationService notificationService;

    public List<CommentDTO> getTaskComments(Long taskId) {
        return commentRepository.findByTaskId(taskId).stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentDTO addComment(Long taskId, String content, String username) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Comment comment = new Comment();
        comment.setTask(task);
        comment.setContent(content);
        comment.setUser(user);
        
        Comment saved = commentRepository.save(comment);

        activityService.logActivity(task.getProject(), task, user, "ADDED_COMMENT", "added a comment to task: " + task.getTitle());

        // --- Trigger Notification ---
        if (task.getAssignee() != null && !task.getAssignee().getId().equals(user.getId())) {
            notificationService.createNotification(
                task.getAssignee(),
                "New Comment",
                user.getUsername() + " commented on your task: " + task.getTitle()
            );
        }

        return mapToDTO(saved);
    }

    private CommentDTO mapToDTO(Comment c) {
        CommentDTO dto = new CommentDTO();
        dto.setId(c.getId());
        dto.setContent(c.getContent());
        dto.setCreatedAt(c.getCreatedAt());

        UserDTO u = new UserDTO();
        u.setId(c.getUser().getId());
        u.setUsername(c.getUser().getUsername());
        u.setEmail(c.getUser().getEmail());
        u.setRole(c.getUser().getRole().getName().name());
        dto.setUser(u);

        return dto;
    }
}