"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateModificationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_modification_dto_1 = require("./create-modification.dto");
class UpdateModificationDto extends (0, mapped_types_1.PartialType)(create_modification_dto_1.CreateModificationDto) {
}
exports.UpdateModificationDto = UpdateModificationDto;
//# sourceMappingURL=update-modification.dto.js.map