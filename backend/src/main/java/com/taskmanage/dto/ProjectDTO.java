package com.taskmanage.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProjectDTO {
    private Long id;
    private Long workspaceId;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private UserDTO createdBy;
    private LocalDateTime createdAt;
    private List<UserDTO> members;
}
