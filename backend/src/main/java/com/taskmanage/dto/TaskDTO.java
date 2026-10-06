package com.taskmanage.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskDTO {
    private Long id;
    private Long projectId;
    private String title;
    private String description;
    private String status;
    private String priority;
    private LocalDate startDate;
    private LocalDate dueDate;
    private UserDTO assignee;
    private UserDTO createdBy;
    private List<LabelDTO> labels;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
