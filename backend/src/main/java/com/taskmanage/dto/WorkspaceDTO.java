package com.taskmanage.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WorkspaceDTO {
    private Long id;
    private String name;
    private String description;
    private UserDTO owner;
    private LocalDateTime createdAt;
    private java.util.List<UserDTO> members;
}
