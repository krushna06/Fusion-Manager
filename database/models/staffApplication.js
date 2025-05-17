export default function (sequelize, DataTypes) {
  return sequelize.define('StaffApplication', {
    channel_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    staff_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    manager_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'staff_applications',
    timestamps: false,
  });
}
