package com.taskmanage.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CommentDTO {
    private Long id;
    private String content;
    private UserDTO user;
    private LocalDateTime createdAt;
}